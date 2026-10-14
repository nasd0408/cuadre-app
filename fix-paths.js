const fs = require('fs');
const path = require('path');

// Parchear index.html
let html = fs.readFileSync('./dist/index.html', 'utf8');
html = html.replace(/"\/_expo\//g, '"/app/_expo/');
html = html.replace(/'\/_expo\//g, "'/app/_expo/");

// ✅ Parchear TODOS los href/src con rutas absolutas en el HTML
html = html.replace(/(href|src)="\/(?!app\/)/g, '$1="/app/');

fs.writeFileSync('./dist/index.html', html);
console.log('✅ index.html fixed');

// Parchear el bundle JS
const jsDir = './dist/_expo/static/js/web/';
const files = fs.readdirSync(jsDir);
files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = jsDir + file;
    let js = fs.readFileSync(filePath, 'utf8');

    // ✅ Captura comilla doble, simple, y backtick
    js = js.replace(/([`'"])\/assets\//g, '$1/app/assets/');

    fs.writeFileSync(filePath, js);
    console.log(`✅ ${file} fixed`);
  }
});