import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5717');
  
  // Inject mock handle and trigger startApp
  await page.evaluate(async () => {
    const mockData = {
      patients: [{
        id: 1,
        name: '検証 テスト太郎',
        start_date: new Date().toISOString().split('T')[0],
        status: 'active',
        visible: 1
      }],
      dispensings: []
    };
    
    // Set rawData directly to bypass loadData
    // We need to wait for the React component to mount and expose a hook or just wait for App to be ready
    // Actually, we can just wait for FolderSelectScreen and click a button if we can mock showDirectoryPicker
    
    window.showDirectoryPicker = async () => ({
        kind: 'directory',
        name: 'mock',
        getFileHandle: async () => ({
            getFile: async () => ({
                text: async () => JSON.stringify(mockData)
            }),
            createWritable: async () => ({
                write: async () => {},
                close: async () => {}
            })
        }),
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted'
    });
  });

  // Click the folder button (which is now mocked)
  await page.click('button:has-text("フォルダを選択")');
  
  // Wait for the app to load
  await page.waitForSelector('text=患者一覧');
  
  // Go to Register tab or just click a patient in the list
  await page.click('text=検証 テスト太郎');
  
  await page.waitForSelector('button:has-text("来局記録")');
  await page.click('button:has-text("来局記録")');
  
  await page.waitForSelector('button:has-text("印刷")');

  // Intercept window.print
  await page.evaluate(() => {
    window.print = () => { console.log("PRINT CALLED"); };
  });
  
  await page.click('button:has-text("印刷")');

  // Emulate print CSS
  await page.emulateMedia({ media: 'print' });

  // Wait for clones and classes
  await page.waitForTimeout(200);

  // Snapshot
  await page.screenshot({ path: path.join(process.cwd(), 'print_preview.png'), fullPage: true });

  await browser.close();
  console.log("Screenshot generated at print_preview.png");
})();
