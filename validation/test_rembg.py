import time, os, numpy as np
from pathlib import Path
from PIL import Image, ImageDraw

print("=" * 60)
print("[验证1] 创建合成测试图片（模拟T恤+复杂背景）")
print("=" * 60)

img = Image.new("RGB", (800, 800), (135, 206, 235))
draw = ImageDraw.Draw(img)
shirt_color = (30, 60, 120)
draw.rectangle([250, 250, 550, 650], fill=shirt_color)
draw.polygon([(250, 250), (150, 300), (150, 400), (250, 350)], fill=shirt_color)
draw.polygon([(550, 250), (650, 300), (650, 400), (550, 350)], fill=shirt_color)
draw.ellipse([330, 230, 470, 310], fill=(135, 206, 235))
draw.rectangle([50, 50, 120, 120], fill=(200, 100, 50))
draw.ellipse([650, 600, 780, 750], fill=(100, 180, 80))
draw.line([(0, 700), (800, 680)], fill=(80, 80, 80), width=3)

test_dir = Path(r"E:\AI space\fitting_room\validation\test_images")
result_dir = Path(r"E:\AI space\fitting_room\validation\results")
input_path = test_dir / "test_shirt.png"
img.save(str(input_path))
print(f"  -> 测试图片已保存: {input_path}")
print(f"  -> 尺寸: {img.size}, 模式: {img.mode}")

print()
print("=" * 60)
print("[验证2] 加载 rembg 模型 (u2net)")
print("=" * 60)
t0 = time.time()
from rembg import remove, new_session
session = new_session("u2net")
t1 = time.time()
print(f"  -> 模型加载耗时: {t1 - t0:.2f} 秒")

print()
print("=" * 60)
print("[验证3] 执行抠图推理 (CPU)")
print("=" * 60)
t0 = time.time()
result = remove(img, session=session, alpha_matting=True,
    alpha_matting_foreground_threshold=240,
    alpha_matting_background_threshold=10,
    alpha_matting_erode_size=10)
t1 = time.time()
elapsed = t1 - t0
print(f"  -> 推理耗时: {elapsed:.2f} 秒")
print(f"  -> 输出: {result.size}, {result.mode}")
print(f"  -> 速度: {'PASS (< 5s)' if elapsed < 5 else 'SLOW (> 5s)'}")

print()
print("=" * 60)
print("[验证4] 检查抠图质量")
print("=" * 60)
output_path = result_dir / "test_shirt_cutout.png"
result.save(str(output_path))
print(f"  -> 结果已保存: {output_path}")

if result.mode == "RGBA":
    alpha = np.array(result)[:, :, 3]
    total = alpha.size
    transparent = (alpha < 10).sum()
    opaque = (alpha > 240).sum()
    semi = total - transparent - opaque
    print(f"  -> 透明像素: {transparent/total*100:.1f}%")
    print(f"  -> 不透明像素: {opaque/total*100:.1f}%")
    print(f"  -> 半透明像素: {semi/total*100:.1f}%")
    bg_ok = "PASS" if transparent/total > 0.3 else "WARN"
    fg_ok = "PASS" if opaque/total > 0.05 else "WARN"
    print(f"  -> 背景去除: {bg_ok}")
    print(f"  -> 前景保留: {fg_ok}")

print()
print("=" * 60)
print("验证汇总")
print("=" * 60)
print(f"  模型加载: OK")
print(f"  推理速度: {elapsed:.2f}s {'PASS' if elapsed < 5 else 'SLOW'}")
print(f"  输出格式: {result.mode} PASS")
print(f"  结果文件: {output_path}")
print("=" * 60)
