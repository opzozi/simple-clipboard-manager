// Post-build script to move popup.html to the correct location
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
    console.log('✓ Moved popup.html to dist root');
    
    // Update the HTML to fix asset paths and remove crossorigin (causes issues in extensions)
    let htmlContent = fs.readFileSync(popupDest, 'utf8');
    // Fix absolute paths: /assets/ -> assets/
    htmlContent = htmlContent.replace(/src="\/assets\//g, 'src="assets/');
    htmlContent = htmlContent.replace(/href="\/assets\//g, 'href="assets/');
    // Remove crossorigin attribute (causes CSP issues in Chrome extensions)
    htmlContent = htmlContent.replace(/\s+crossorigin="[^"]*"/g, '');
    htmlContent = htmlContent.replace(/\s+crossorigin/g, ''); // Also handle crossorigin without value
    
    // Add CSP meta tag to allow module scripts (if not already present)
    if (!htmlContent.includes('Content-Security-Policy')) {
      const cspMeta = '<meta http-equiv="Content-Security-Policy" content="script-src \'self\'; style-src \'self\' \'unsafe-inline\'; object-src \'none\';">';
      htmlContent = htmlContent.replace('<head>', `<head>\n  ${cspMeta}`);
    }
    
    fs.writeFileSync(popupDest, htmlContent);
    console.log('✓ Fixed asset paths, removed crossorigin, and added CSP in popup.html');
  } else {
    console.warn('⚠ popup source file not found:', popupSource);
  }
} catch (error) {
  console.error('❌ Error fixing popup path:', error);
  process.exit(1);
}
