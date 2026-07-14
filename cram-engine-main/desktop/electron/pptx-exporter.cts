/**
 * pptx-exporter.cts — PPTX 导出模块
 *
 * Phase 6 / OpenMAIC: 将课程幻灯片场景导出为标准 .pptx 文件。
 * 纯 Node.js 实现，使用 ZIP + XML，无需外部依赖。
 */

import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

// ---- 类型 ----

type SlidePage = {
  index: number;
  title: string;
  bulletPoints: string[];
  voiceScript: string;
};

type Chapter = {
  id: string;
  title: string;
};

type CourseOutline = {
  meta: { title: string };
  chapters: Chapter[];
};

type SlideLectureScene = {
  sceneType: 'slide-lecture';
  chapterId: string;
  slides: SlidePage[];
};

// ---- XML 构建工具 ----

function xmlEscape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildContentTypes(slideCount: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${Array.from({ length: slideCount }, (_, i) => `  <Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n')}
</Types>`;
}

function buildRels(target: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${target}"/>
</Relationships>`;
}

function buildPresentationRels(slideCount: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdTM" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
  <Relationship Id="rIdSM" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${Array.from({ length: slideCount }, (_, i) => `  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('\n')}
</Relationships>`;
}

function buildPresentation(slideCount: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  saveSubsetFonts="1">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rIdSM"/></p:sldMasterIdLst>
  <p:sldIdLst>
${Array.from({ length: slideCount }, (_, i) => `    <p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('\n')}
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;
}

function buildSlideMaster(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;
}

function buildSlideMasterRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
}

function buildSlideLayout(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="title">
  <p:cSld name="Title Slide"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
</p:sldLayout>`;
}

function buildTheme(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office">
  <a:themeElements>
    <a:clrScheme name="Default">
      <a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Default"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface="微软雅黑"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface="微软雅黑"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Default"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`;
}

function buildSlide(slide: SlidePage, index: number): string {
  const titleY = 600000;
  const contentY = 1600000;
  const contentStart = contentY;
  const lineHeight = 500000;

  const bullets = slide.bulletPoints.map((point, i) => {
    return `<a:p><a:r><a:rPr lang="zh-CN" sz="2400"/><a:t>• ${xmlEscape(point)}</a:t></a:r></a:p>`;
  }).join('');

  // Voice script as notes
  const notes = slide.voiceScript ? `
  <p:notes>
    <p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="1" name=""/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="1200"/><a:t>${xmlEscape(slide.voiceScript)}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
  </p:notes>` : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <!-- Title -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="800000" y="${titleY}"/><a:ext cx="10500000" cy="800000"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/>
          <a:p><a:r><a:rPr lang="zh-CN" sz="3600" b="1"/><a:t>${xmlEscape(slide.title)}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <!-- Content Bullets -->
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Content"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="800000" y="${contentY}"/><a:ext cx="10500000" cy="${slide.bulletPoints.length * lineHeight + 500000}"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/>
          ${bullets}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  ${notes}
</p:sld>`;
}

// ---- ZIP 构建 ----

async function buildPptxZip(outputPath: string, slides: SlidePage[], courseTitle: string) {
  // Use a simple store-based ZIP (since we're building XML, compression isn't critical)
  // We'll write a raw ZIP file with stored (uncompressed) entries

  const files: Array<{ name: string; content: Buffer }> = [];

  const addFile = (name: string, content: string) => {
    files.push({ name: name, content: Buffer.from(content, 'utf8') });
  };

  const slideCount = slides.length;

  // Standard PPTX structure
  addFile('[Content_Types].xml', buildContentTypes(slideCount));
  addFile('_rels/.rels', buildRels('ppt/presentation.xml'));
  addFile('ppt/_rels/presentation.xml.rels', buildPresentationRels(slideCount));
  addFile('ppt/presentation.xml', buildPresentation(slideCount).replace('rId5', `rId${slideCount}`));
  addFile('ppt/slideMasters/slideMaster1.xml', buildSlideMaster());
  addFile('ppt/slideMasters/_rels/slideMaster1.xml.rels', buildSlideMasterRels());
  addFile('ppt/slideLayouts/slideLayout1.xml', buildSlideLayout());
  addFile('ppt/theme/theme1.xml', buildTheme());

  slides.forEach((slide, i) => {
    addFile(`ppt/slides/slide${i + 1}.xml`, buildSlide(slide, i + 1));
  });

  // Build ZIP (local file header + data + central directory)
  const chunks: Buffer[] = [];
  const cdEntries: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'ascii');
    const crc = crc32(file.content);

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4);          // version needed
    localHeader.writeUInt16LE(0, 6);           // flags
    localHeader.writeUInt16LE(0, 8);           // compression (stored)
    localHeader.writeUInt16LE(0, 10);          // mod time
    localHeader.writeUInt16LE(0, 12);          // mod date
    localHeader.writeUInt32LE(crc, 14);        // crc32
    localHeader.writeUInt32LE(file.content.length, 18); // compressed size
    localHeader.writeUInt32LE(file.content.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26);       // filename length
    localHeader.writeUInt16LE(0, 28);                    // extra field length
    nameBuf.copy(localHeader, 30);

    chunks.push(localHeader);
    chunks.push(file.content);
    offset += localHeader.length + file.content.length;

    // Central directory entry
    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(file.content.length, 20);
    cd.writeUInt32LE(file.content.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt32LE(0, 34);
    cd.writeUInt32LE(offset - localHeader.length - file.content.length, 42);
    nameBuf.copy(cd, 46);
    cdEntries.push(cd);
  }

  const cdStart = offset;
  for (const cd of cdEntries) {
    chunks.push(cd);
    offset += cd.length;
  }

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(offset - cdStart, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);
  chunks.push(eocd);

  const finalBuffer = Buffer.concat(chunks);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(outputPath, finalBuffer);
}

// ---- CRC32 (simple implementation) ----

function crc32(data: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ---- 导出接口 ----

export async function exportPptx(
  outputDir: string,
  scenes: { sceneType: string; slides?: SlidePage[] }[],
  courseTitle: string
): Promise<string> {
  const slides = scenes
    .filter(s => s.sceneType === 'slide-lecture' && s.slides)
    .flatMap(s => s.slides!);

  if (slides.length === 0) {
    throw new Error('没有可导出的幻灯片内容');
  }

  await mkdir(outputDir, { recursive: true });
  const pptxPath = path.join(outputDir, `${courseTitle.replace(/[\/\\:*?"<>|]/g, '_')}.pptx`);
  await buildPptxZip(pptxPath, slides, courseTitle);
  return pptxPath;
}
