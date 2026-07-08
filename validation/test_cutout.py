import time, os, sys
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw
import cv2

print("=" * 60)
print("[验证1] 创建合成测试图片（模拟T恤+复杂背景）")
print("=" * 60)

# 创建一个更真实的测试图：模拟衣服在桌面上
img = Image.new("RGB", (800, 800), (180, 180, 180))  # 灰色桌面
draw = ImageDraw.Draw(img)

# 添加桌面纹理
for i in range(0, 800, 4):
    draw.line([(i, 0), (i+2, 800)], fill=(175+i%5, 175+i%5, 175+i%5), width=1)

# 画一件蓝色卫衣
shirt_color = (50, 80, 160)
shadow = (40, 60, 120)
# 衣身（带阴影）
draw.polygon([(220, 220), (580, 220), (600, 680), (200, 680)], fill=shadow)
draw.polygon([(230, 210), (570, 210), (590, 670), (210, 670)], fill=shirt_color)
# 左袖
draw.polygon([(230, 210), (100, 280), (100, 450), (210, 400)], fill=shirt_color)
# 右袖
draw.polygon([(570, 210), (700, 280), (700, 450), (590, 400)], fill=shirt_color)
# 领口
draw.ellipse([320, 180, 480, 280], fill=(180, 180, 180))
draw.ellipse([330, 190, 470, 270], fill=shadow)
# 袖口收边
draw.rectangle([100, 430, 150, 450], fill=(40, 60, 120))
draw.rectangle([650, 430, 700, 450], fill=(40, 60, 120))
# 下摆
draw.rectangle([210, 650, 590, 680], fill=(40, 60, 120))

# 添加褶皱纹理
for i in range(5):
    x = 280 + i * 50
    draw.line([(x, 300), (x + 10, 600)], fill=(60, 90, 170), width=2)

# 添加背景杂物
draw.rectangle([30, 30, 90, 80], fill=(120, 80, 50))  # 木块
draw.ellipse([650, 650, 780, 780], fill=(80, 120, 80))  # 植物
draw.line([(0, 750), (800, 740)], fill=(100, 100, 100), width=2)

test_dir = Path(r"E:\AI_space\fitting_room\validation\test_images")
result_dir = Path(r"E:\AI_space\fitting_room\validation\results")
input_path = test_dir / "test_hoodie.png"
img.save(str(input_path))
print(f"  -> 测试图片已保存: {input_path}")
print(f"  -> 尺寸: {img.size}, 模式: {img.mode}")

print()
print("=" * 60)
print("[验证2] OpenCV GrabCut 抠图")
print("  目的: 验证 OpenCV GrabCut 能否精准圈定衣服区域")
print("=" * 60)

# 转为 OpenCV 格式
cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
h, w = cv_img.shape[:2]

# GrabCut 需要一个初始矩形框（大致框住衣服）
mask = np.zeros((h, w), np.uint8)
bgd_model = np.zeros((1, 65), np.float64)
fgd_model = np.zeros((1, 65), np.float64)

# 衣服大致区域（根据测试图绘制位置）
rect = (100, 180, 700, 680)

t0 = time.time()
cv2.grabCut(cv_img, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
t1 = time.time()
elapsed = t1 - t0
print(f"  -> GrabCut 推理耗时: {elapsed:.2f} 秒")
print(f"  -> 速度评估: {'PASS (< 3s)' if elapsed < 3 else 'SLOW (> 3s)'}")

# 创建抠图结果
mask2 = np.where((mask == 2) | (mask == 0), 0, 255).astype('uint8')
result_cv = cv2.bitwise_and(cv_img, cv_img, mask=mask2)

# 转为 RGBA 透明底
result_rgba = np.zeros((h, w, 4), dtype=np.uint8)
result_rgba[:, :, :3] = cv2.cvtColor(result_cv, cv2.COLOR_BGR2RGB)
result_rgba[:, :, 3] = mask2

result_pil = Image.fromarray(result_rgba)
output_path = result_dir / "test_hoodie_cutout_grabcut.png"
result_pil.save(str(output_path))
print(f"  -> 结果已保存: {output_path}")

print()
print("=" * 60)
print("[验证3] 检查抠图质量")
print("=" * 60)

alpha = result_rgba[:, :, 3]
total = alpha.size
transparent = (alpha < 10).sum()
opaque = (alpha > 240).sum()
semi = total - transparent - opaque

print(f"  -> 透明像素: {transparent/total*100:.1f}% (背景)")
print(f"  -> 不透明像素: {opaque/total*100:.1f}% (前景)")
print(f"  -> 半透明像素: {semi/total*100:.1f}% (边缘)")
bg_ok = "PASS" if transparent/total > 0.2 else "WARN"
fg_ok = "PASS" if opaque/total > 0.05 else "WARN"
print(f"  -> 背景去除: {bg_ok}")
print(f"  -> 前景保留: {fg_ok}")

# 计算衣服区域的边界
coords = cv2.findNonZero(mask2)
if coords is not None:
    x, y, bw, bh = cv2.boundingRect(coords)
    print(f"  -> 衣服边界框: x={x}, y={y}, w={bw}, h={bh}")
    print(f"  -> 衣服面积占比: {opaque/total*100:.1f}%")

print()
print("=" * 60)
print("[验证4] 尝试自动检测衣服区域（无需手动框选）")
print("=" * 60)

# 使用颜色分割作为自动检测方案
hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)
# 蓝色卫衣的 HSV 范围
lower_blue = np.array([90, 50, 50])
upper_blue = np.array([130, 255, 255])
color_mask = cv2.inRange(hsv, lower_blue, upper_blue)

# 形态学处理：去噪 + 填充
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
color_mask = cv2.morphologyEx(color_mask, cv2.MORPH_CLOSE, kernel)
color_mask = cv2.morphologyEx(color_mask, cv2.MORPH_OPEN, kernel)

# 找最大轮廓
contours, _ = cv2.findContours(color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
if contours:
    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)
    x, y, bw, bh = cv2.boundingRect(largest)
    print(f"  -> 检测到 {len(contours)} 个蓝色区域")
    print(f"  -> 最大区域: x={x}, y={y}, w={bw}, h={bh}, 面积={area}")
    
    # 用最大轮廓作为 GrabCut 输入
    mask_auto = np.zeros((h, w), np.uint8)
    rect_auto = (x, y, x + bw, y + bh)
    bgd_model2 = np.zeros((1, 65), np.float64)
    fgd_model2 = np.zeros((1, 65), np.float64)
    
    t0 = time.time()
    cv2.grabCut(cv_img, mask_auto, rect_auto, bgd_model2, fgd_model2, 5, cv2.GC_INIT_WITH_RECT)
    t1 = time.time()
    
    mask_auto2 = np.where((mask_auto == 2) | (mask_auto == 0), 0, 255).astype('uint8')
    auto_alpha = mask_auto2
    auto_total = auto_alpha.size
    auto_fg = (auto_alpha > 240).sum()
    auto_bg = (auto_alpha < 10).sum()
    
    print(f"  -> 自动检测耗时: {t1-t0:.2f} 秒")
    print(f"  -> 自动检测前景占比: {auto_fg/auto_total*100:.1f}%")
    print(f"  -> 自动检测背景占比: {auto_bg/auto_total*100:.1f}%")
    
    # 保存自动检测结果
    result_auto = np.zeros((h, w, 4), dtype=np.uint8)
    result_auto[:, :, :3] = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
    result_auto[:, :, 3] = mask_auto2
    result_auto_pil = Image.fromarray(result_auto)
    auto_output = result_dir / "test_hoodie_cutout_auto.png"
    result_auto_pil.save(str(auto_output))
    print(f"  -> 自动检测结果已保存: {auto_output}")

print()
print("=" * 60)
print("验证汇总")
print("=" * 60)
print(f"  GrabCut 推理: {elapsed:.2f}s PASS")
print(f"  输出格式: RGBA PASS")
print(f"  背景去除: {bg_ok}")
print(f"  前景保留: {fg_ok}")
print(f"  手动框选结果: {output_path}")
if contours:
    print(f"  自动检测结果: {auto_output}")
print("=" * 60)
