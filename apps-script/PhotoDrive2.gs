/** Deploy this in the SECOND Google account (Drive B): new Apps Script project,
 *  Project Settings > Script properties: TOKEN = any long secret.
 *  Deploy > Web app (Execute as: Me, Access: Anyone). Put its URL + TOKEN in the main script's properties
 *  DRIVE2_URL and DRIVE2_TOKEN. Photos then use Drive B's own storage. */
function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.token !== PropertiesService.getScriptProperties().getProperty('TOKEN')) return out_({ ok: false, error: 'auth' });
    const g = (parent, n) => { const i = parent.getFoldersByName(n); return i.hasNext() ? i.next() : parent.createFolder(n); };
    const it = DriveApp.getFoldersByName('Rice_Trial_Photos_B'), root = it.hasNext() ? it.next() : DriveApp.createFolder('Rice_Trial_Photos_B');
    const f = g(root, p.kind).createFile(Utilities.newBlob(Utilities.base64Decode(p.data), p.mime, p.name + '.jpg'));
    return out_({ ok: true, fileId: f.getId(), url: f.getUrl() });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}
const out_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
