import { renderRichContent } from '../lib/richContent.js';

type RichMathContentProps = {
  content: string;
  inline?: boolean;
  className?: string;
};

export function RichMathContent({ content, inline = false, className = '' }: RichMathContentProps) {
  const html = renderRichContent(content, { inline });

  if (inline) {
    return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
