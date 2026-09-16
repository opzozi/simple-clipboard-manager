import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const popupSource = path.join(distDir, 'src/popup/index.html');
const popupDest = path.join(distDir, 'popup.html');

try {
  if (fs.existsSync(popupSource)) {
    fs.copyFileSync(popupSource, popupDest);

    let htmlContent = fs.readFileSync(popupDest, 'utf8');
    htmlContent = htmlContent.replace(/src="\/assets\//g, 'src="assets/');
    htmlContent = htmlContent.replace(/href="\/assets\//g, 'href="assets/');
    htmlContent = htmlContent.replace(/\s+crossorigin="[^"]*"/g, '');
    htmlContent = htmlContent.replace(/\s+crossorigin/g, '');

    if (!htmlContent.includes('Content-Security-Policy')) {
      const cspMeta = '<meta http-equiv="Content-Security-Policy" content="script-src \'self\'; style-src \'self\' \'unsafe-inline\'; object-src \'none\';">';
      htmlContent = htmlContent.replace('<head>', `<head>\n  ${cspMeta}`);
    }

    fs.writeFileSync(popupDest, htmlContent);
    fs.rmSync(path.join(distDir, 'src'), { recursive: true, force: true });
    console.log('Moved popup.html to dist root and fixed asset paths');
  } else {
    console.warn('popup source file not found:', popupSource);
  }
} catch (error) {
  console.error('Error fixing popup path:', error);
  process.exit(1);
}
