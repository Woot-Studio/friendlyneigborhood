import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function png(size) {
	const rose = [0x8e, 0x2f, 0x4a, 0xff];
	const white = [255, 255, 255, 255];
	const raw = Buffer.alloc((size * 4 + 1) * size);
	const radius = Math.round(size * 0.28);
	for (let y = 0; y < size; y++) {
		raw[y * (size * 4 + 1)] = 0;
		for (let x = 0; x < size; x++) {
			const inset = Math.min(x, y, size - 1 - x, size - 1 - y);
			const corner =
				(x < radius && y < radius && (radius - x) ** 2 + (radius - y) ** 2 > radius ** 2) ||
				(x >= size - radius && y < radius && (x - (size - radius)) ** 2 + (radius - y) ** 2 > radius ** 2) ||
				(x < radius && y >= size - radius && (radius - x) ** 2 + (y - (size - radius)) ** 2 > radius ** 2) ||
				(x >= size - radius &&
					y >= size - radius &&
					(x - (size - radius)) ** 2 + (y - (size - radius)) ** 2 > radius ** 2);
			const color = corner ? [0, 0, 0, 0] : inset > size * 0.22 && inset < size * 0.34 ? white : rose;
			raw.set(color, y * (size * 4 + 1) + 1 + x * 4);
		}
	}
	const chunk = (type, data) => {
		const body = Buffer.concat([Buffer.from(type), data]);
		const crc = Buffer.alloc(4);
		crc.writeUInt32BE(crc32(body));
		const len = Buffer.alloc(4);
		len.writeUInt32BE(data.length);
		return Buffer.concat([len, body, crc]);
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0))
	]);
}

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	table[n] = c;
}
function crc32(buf) {
	let c = 0xffffffff;
	for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

mkdirSync('static/icons', { recursive: true });
writeFileSync('static/icons/icon-192.png', png(192));
writeFileSync('static/icons/icon-512.png', png(512));
console.log('ikon ditulis');
