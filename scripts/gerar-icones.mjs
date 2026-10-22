// Gera os ícones do app (PWA) a partir de um SVG. Rodar: node scripts/gerar-icones.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

// Etiqueta de preço com cifrão, fundo verde da marca.
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f6f4a"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
    <path d="M96 104 h170 l150 150 -146 146 -174 -174 z" fill="#f5f5f0"/>
    <circle cx="170" cy="160" r="26" fill="#1f6f4a"/>
    <text x="300" y="335" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="170" fill="#1f6f4a" transform="rotate(-45 300 300)">$</text>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const alvos = [
  ["public/icons/icon-192.png", 192, 40],
  ["public/icons/icon-512.png", 512, 40],
  ["public/icons/maskable-512.png", 512, 110],
  ["public/icons/apple-touch-icon.png", 180, 60],
];
for (const [arquivo, tamanho, pad] of alvos) {
  await sharp(Buffer.from(svg(pad))).resize(tamanho, tamanho).png().toFile(arquivo);
  console.log("ok", arquivo);
}
await sharp(Buffer.from(svg(40))).resize(64, 64).png().toFile("src/app/icon.png");
