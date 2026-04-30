import cp from 'child_process';
const files = [
  'src/index.css',
  'src/pages/AdminLogin.tsx',
  'src/pages/Cart.tsx',
  'src/pages/Checkout.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/ProductList.tsx',
  'src/vite-env.d.ts',
  'server.ts'
];
for (const f of files) {
  try {
    const out = cp.execSync(`diff -u ${f} _temp_repo/${f}`, {encoding: 'utf8'});
    console.log(out);
  } catch (e) {
    if (e.stdout) console.log(e.stdout);
  }
}
