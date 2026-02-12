/**
 * Script to remove framer-motion from a single file.
 * Usage: node remove-framer-motion.js <filepath>
 *
 * What it does:
 * 1. Removes the framer-motion import line
 * 2. Replaces <motion.div ...> with <div className="animate-fadeInUp" ...>
 * 3. Replaces </motion.div> with </div>
 * 4. Same for motion.h1, motion.p, motion.span, motion.button, motion.form, motion.nav, motion.path, motion.a, motion.img, motion.section, motion.li, motion.ul
 * 5. Removes framer-specific props: initial, animate, transition, whileHover, whileTap, whileInView, viewport, exit, variants, layout, key (from motion)
 * 6. Removes <AnimatePresence> and </AnimatePresence> wrappers
 * 7. Removes AnimatePresenceWithChildren wrappers
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node remove-framer-motion.js <filepath>');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
const originalContent = content;

// Step 1: Remove import line
content = content.replace(/import\s*\{[^}]*\}\s*from\s*'framer-motion';\r?\n?/g, '');

// Step 2: Remove AnimatePresence wrappers (both opening and closing)
content = content.replace(/\s*<AnimatePresence[^>]*>\r?\n?/g, '\n');
content = content.replace(/\s*<\/AnimatePresence>\r?\n?/g, '\n');

// Remove AnimatePresenceWithChildren wrappers
content = content.replace(/const\s+AnimatePresenceWithChildren\s*=\s*AnimatePresence\s+as[^;]+;\r?\n?/g, '');
content = content.replace(/\s*<AnimatePresenceWithChildren[^>]*>\r?\n?/g, '\n');
content = content.replace(/\s*<\/AnimatePresenceWithChildren>\r?\n?/g, '\n');

// Step 3: Replace motion.X opening tags
// Match <motion.tagname followed by props and either > or />
// We need to also remove framer-specific props

const motionTags = ['div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'button', 'form', 'nav', 'path', 'a', 'img', 'section', 'li', 'ul', 'ol', 'header', 'footer', 'main', 'article', 'aside', 'input', 'label', 'svg', 'circle', 'rect', 'g'];

for (const tag of motionTags) {
  // Replace opening tags: <motion.tag ... > or <motion.tag ... />
  const openRegex = new RegExp(`<motion\\.${tag}(\\s|>|/>)`, 'g');
  content = content.replace(openRegex, `<${tag}$1`);

  // Replace closing tags: </motion.tag>
  const closeRegex = new RegExp(`</motion\\.${tag}>`, 'g');
  content = content.replace(closeRegex, `</${tag}>`);
}

// Step 4: Remove framer-motion specific props
// These can be single-line or multi-line

// Props that take object values: initial={{ ... }}, animate={{ ... }}, etc.
// Handle nested braces properly
function removeJsxProp(content, propName) {
  // Pattern: propName={{ ... }} or propName={value} or propName="string"
  // Also handle: propName={condition ? value : value}

  // First handle propName={{ ... }} with nested braces
  let result = content;

  // Simple case: prop={false} or prop={true} or prop={0} or prop={identifier}
  result = result.replace(new RegExp(`\\s+${propName}=\\{[^{}]+\\}`, 'g'), '');

  // Object case: prop={{ ... }} - handle nested braces up to 3 levels deep
  // Level 1: {{ simple }}
  result = result.replace(new RegExp(`\\s+${propName}=\\{\\{[^{}]*\\}\\}`, 'g'), '');
  // Level 2: {{ { nested } }}
  result = result.replace(new RegExp(`\\s+${propName}=\\{\\{[^{}]*\\{[^{}]*\\}[^{}]*\\}\\}`, 'g'), '');
  // Level 3
  result = result.replace(new RegExp(`\\s+${propName}=\\{\\{[^{}]*\\{[^{}]*\\{[^{}]*\\}[^{}]*\\}[^{}]*\\}\\}`, 'g'), '');

  // String case: prop="string"
  result = result.replace(new RegExp(`\\s+${propName}="[^"]*"`, 'g'), '');

  return result;
}

const framerProps = [
  'initial', 'animate', 'transition', 'whileHover', 'whileTap',
  'whileInView', 'viewport', 'exit', 'variants', 'layout',
  'layoutId', 'onAnimationComplete', 'custom', 'drag', 'dragConstraints',
  'dragElastic', 'onDragEnd', 'whileDrag', 'whileFocus'
];

for (const prop of framerProps) {
  content = removeJsxProp(content, prop);
}

// Step 5: Clean up any resulting empty lines (more than 2 consecutive)
content = content.replace(/(\r?\n){3,}/g, '\n\n');

if (content !== originalContent) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${path.basename(filePath)} - framer-motion removed`);
} else {
  console.log(`⏭️  ${path.basename(filePath)} - no changes needed`);
}
