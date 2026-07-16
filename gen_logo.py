from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1536, 1024
BG = (10, 14, 23)          # #0A0E17 terminal dark
ACCENT = (45, 212, 170)    # #2DD4AA teal
ACCENT2 = (56, 183, 224)   # #38B7E0 cyan
TEXT = (245, 248, 252)
MUTED = (120, 134, 152)

FONT_B = "C:/Windows/Fonts/arialbd.ttf"
FONT_R = "C:/Windows/Fonts/arial.ttf"

def font(size, bold=True):
    return ImageFont.truetype(FONT_B if bold else FONT_R, size)

img = Image.new("RGBA", (W, H), BG)
draw = ImageDraw.Draw(img)

# --- soft radial glow behind the icon ---
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
cx, cy = 360, H // 2
gd.ellipse([cx - 320, cy - 320, cx + 320, cy + 320], fill=ACCENT + (70,))
glow = glow.filter(ImageFilter.GaussianBlur(140))
img = Image.alpha_composite(img, glow)
draw = ImageDraw.Draw(img)

# --- app icon (rounded square with teal -> cyan gradient) ---
icon = 360
ix, iy = 180, (H - icon) // 2
mask = Image.new("L", (W, H), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([ix, iy, ix + icon, iy + icon], radius=84, fill=255)

grad = Image.new("RGBA", (icon, icon))
gd = ImageDraw.Draw(grad)
for y in range(icon):
    t = y / icon
    r = int(ACCENT[0] + (ACCENT2[0] - ACCENT[0]) * t)
    g = int(ACCENT[1] + (ACCENT2[1] - ACCENT[1]) * t)
    b = int(ACCENT[2] + (ACCENT2[2] - ACCENT[2]) * t)
    gd.line([(0, y), (icon, y)], fill=(r, g, b, 255))
grad = grad.resize((icon, icon))

# top sheen for depth
sheen = Image.new("RGBA", (icon, icon), (0, 0, 0, 0))
sd = ImageDraw.Draw(sheen)
sd.rounded_rectangle([0, 0, icon, icon * 0.55], radius=84, fill=(255, 255, 255, 38))
grad = Image.alpha_composite(grad, sheen)

icon_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
icon_layer.paste(grad, (ix, iy), grad)
icon_layer.putalpha(mask)
img = Image.alpha_composite(img, icon_layer)
draw = ImageDraw.Draw(img)

# clip inner chart to icon
clip = Image.new("RGBA", (W, H), (0, 0, 0, 0))
cd = ImageDraw.Draw(clip)
# upward line chart
pts = [(ix + 70, iy + 250), (ix + 120, iy + 210), (ix + 175, iy + 235),
       (ix + 230, iy + 150), (ix + 285, iy + 175), (ix + 320, iy + 90)]
cd.line(pts, fill=(255, 255, 255, 255), width=12, joint="curve")
# end glow dot
ed = ImageDraw.Draw(clip)
ed.ellipse([pts[-1][0] - 16, pts[-1][1] - 16, pts[-1][0] + 16, pts[-1][1] + 16], fill=(255, 255, 255, 255))
# small candlesticks
for bx, up in [(ix + 110, True), (ix + 200, False)]:
    col = (34, 197, 120, 255) if up else (244, 90, 110, 255)
    cd.line([(bx, iy + 120), (bx, iy + 300)], fill=col, width=8)
    top, bot = (iy + 140, iy + 175) if up else (iy + 245, iy + 280)
    cd.rectangle([bx - 18, top, bx + 18, bot], fill=col)
clip.putalpha(mask)
img = Image.alpha_composite(img, clip)
draw = ImageDraw.Draw(img)

# --- wordmark with auto-fit ---
text = "Trade Vision"
left = ix + icon + 90
avail = W - left - 80
fs = 230
f = font(fs)
while f.getlength(text) > avail and fs > 40:
    fs -= 4
    f = font(fs)
tw = f.getlength(text)
ty = cy - fs // 2 - 6
# "Trade" white + "Vision" accent
w1 = f.getlength("Trade ")
draw.text((left, ty), "Trade ", font=f, fill=TEXT)
draw.text((left + w1, ty), "Vision", font=f, fill=ACCENT)

# small muted tagline
tf = font(40, bold=False)
tag = "Trade Smarter. Invest Better."
draw.text((left + 4, ty + fs + 18), tag, font=tf, fill=MUTED)

img.convert("RGB").save("Logo.png")
print("saved Logo.png", img.size)
