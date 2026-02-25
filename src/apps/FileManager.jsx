/**
 * FileManager.jsx
 * ───────────────
 * Full implementation goes here.
 * Props received from Desktop.jsx:
 *   vfs, setVfs, theme, notify, onOpenFile(file), onOpenApp(appId), onClose, initialFile
 *
 * Export VirtualFileSystem class as a named export so Desktop can init the VFS.
 */

import React from 'react';

export class VirtualFileSystem {
  constructor() {
    this.tree = {
      '/': {
        type: 'dir',
        children: {
          Desktop   : { type: 'dir', children: {} },
          Documents : { type: 'dir', children: {
            'welcome.txt': { type: 'file', content: 'Welcome to LynkOS!\n\nThis is your virtual file system.', size: 60, modified: Date.now() },
          }},
          Downloads : { type: 'dir', children: {} },
          Pictures  : { type: 'dir', children: {} },
          Music     : { type: 'dir', children: {} },
          Videos    : { type: 'dir', children: {} },
        },
      },
    };
  }

  ls(path = '/') { /* returns children */ }
  read(path) { /* returns file content */ }
  write(path, content) { /* write file */ }
  mkdir(path) { /* make dir */ }
  rm(path) { /* remove */ }
  mv(from, to) { /* move */ }
}

export default function FileManager({ notify, onOpenFile, onOpenApp, onClose }) {
  return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#0d0d14', color:'rgba(255,255,255,0.5)', flexDirection:'column', gap:12 }}>
      <span style={{ fontSize:48 }}>🗂️</span>
      <span style={{ fontSize:14 }}>File Manager — implementation pending</span>
      <span style={{ fontSize:11, opacity:0.4 }}>See apps/FileManager.jsx</span>
    </div>
  );
}