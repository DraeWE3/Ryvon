const to = 'test@example.com';
const subject = 'Test';
const body = 'Hello';
const attachmentsData = [{name: 'test.txt', contentType: 'text/plain', dataBase64: Buffer.from('hello').toString('base64')}];
const boundary = '----=_Part_123_Ryvon';
const lines = [
  'To: ' + to,
  'Subject: ' + subject,
  'MIME-Version: 1.0',
];
lines.push('Content-Type: multipart/mixed; boundary="' + boundary + '"');
lines.push('');
lines.push('--' + boundary);
lines.push('Content-Type: text/plain; charset="UTF-8"');
lines.push('');
lines.push(body);
lines.push('');
for (const att of attachmentsData) {
  lines.push('--' + boundary);
  lines.push('Content-Type: ' + att.contentType + '; name="' + att.name + '"');
  lines.push('Content-Disposition: attachment; filename="' + att.name + '"');
  lines.push('Content-Transfer-Encoding: base64');
  lines.push('');
  lines.push(att.dataBase64);
}
lines.push('--' + boundary + '--');
console.log(lines.join('\r\n'));
