const rawText = '(A) Apple (B) Banana (C) Cherry (8) Date';
let normalizedText = rawText
    .replace(/\(8\)/g, '(B)')
    .replace(/([^\n])\s+(\([A-Da-d1-4]\)|\[[A-Da-d1-4]\]|[A-Da-d1-4][.)])\s/g, '$1\n$2 ');
console.log(normalizedText);
