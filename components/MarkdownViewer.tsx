import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, ExternalLink, AlertCircle } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
  fileName: string;
  lastModified?: number;
  onLinkClick: (href: string) => void;
  onResolveImage: (src: string) => Promise<string | null>; // 异步获取图片URL
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, fileName, lastModified, onLinkClick, onResolveImage }) => {
  const displayTitle = fileName.replace(/\.md$/i, '');

  // 预处理 Wiki Links
  // [[Link]] -> [Link](wikilink:Link)
  // [[Link|Alias]] -> [Alias](wikilink:Link)
  // ![[Image.png]] -> ![Image.png](wikiimage:Image.png)
  const processedContent = useMemo(() => {
    if (!content) return '';
    return content.replace(/(!?)\[\[(.*?)(?:\|(.*?))?\]\]/g, (match, isEmbed, link, alias) => {
      const target = link.trim();
      const text = alias ? alias.trim() : target;
      if (isEmbed) {
        // 图片引用
        return `![${text}](wikiimage:${target})`;
      } else {
        // 页面引用
        return `[${text}](wikilink:${target})`;
      }
    });
  }, [content]);

  // 自定义图片组件，处理异步加载
  const WikiImage = ({ src, alt, ...props }: any) => {
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let isMounted = true;
      const load = async () => {
        if (src && src.startsWith('wikiimage:')) {
          const rawName = src.replace('wikiimage:', '');
          // 必须解码，因为 ReactMarkdown 可能会对 src 属性进行 URL 编码
          const imageName = decodeURIComponent(rawName);
          const url = await onResolveImage(imageName);
          if (isMounted) {
            setImgUrl(url);
            setLoading(false);
          }
        } else {
          // 普通外部链接
          setImgUrl(src);
          setLoading(false);
        }
      };
      load();
      return () => { isMounted = false; };
    }, [src]);

    if (loading) {
      return <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center text-gray-400 text-sm animate-pulse">加载图片中...</div>;
    }

    if (!imgUrl) {
       return (
         <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-red-400 text-sm flex items-center justify-center">
            <AlertCircle size={16} className="mr-2" /> 图片无法加载: {alt}
         </div>
       );
    }

    return (
      <span className="block my-6">
        <img src={imgUrl} className="max-w-full h-auto rounded-lg shadow-sm border border-gray-100 mx-auto" alt={alt} {...props} />
        {alt && !alt.endsWith('.png') && !alt.endsWith('.jpg') && <span className="block text-center text-sm text-gray-400 mt-2">{alt}</span>}
      </span>
    );
  };

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <FileText size={64} className="mb-4 opacity-20" />
        <p className="text-lg">选择左侧文档开始阅读</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[850px] mx-auto px-8 py-12 animate-fade-in">
      {/* 文档标题区 */}
      <div className="mb-8 border-b border-gray-100 pb-6">
        <h1 className="text-4xl font-bold text-[#262626] mb-4 leading-tight">
          {displayTitle}
        </h1>
        {lastModified && (
          <div className="text-xs text-gray-400 flex items-center space-x-4">
             <span>最后编辑于 {new Date(lastModified).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="space-y-6 text-[#262626] leading-relaxed text-[16px]">
        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-10 mb-6 pb-2 border-b border-gray-100" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-10 mb-4" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-xl font-bold mt-8 mb-3" {...props} />,
            h4: ({ node, ...props }) => <h4 className="text-lg font-bold mt-6 mb-2" {...props} />,
            p: ({ node, ...props }) => <p className="mb-4 leading-7 text-justify text-[#262626]" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1 text-gray-700" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-gray-700" {...props} />,
            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-gray-200 pl-4 py-1 my-4 bg-gray-50 text-gray-600 italic rounded-r" {...props} />
            ),
            code: ({ node, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match && !String(children).includes('\n');
              return isInline ? (
                <code className="bg-gray-100 text-[#d4380d] px-1.5 py-0.5 rounded text-sm font-mono mx-1" {...props}>
                  {children}
                </code>
              ) : (
                <pre className="bg-[#f8f8f8] p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono leading-6 border border-gray-100 text-gray-800">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            },
            a: ({ node, href, children, ...props }) => {
              const isWiki = href?.startsWith('wikilink:');
              return (
                <a 
                  href={href}
                  onClick={(e) => {
                    if (isWiki && href) {
                      e.preventDefault();
                      onLinkClick(href);
                    }
                  }}
                  className={`cursor-pointer transition-colors ${isWiki ? 'text-[#00b96b] hover:text-[#009456] border-b border-[#00b96b]/30 hover:border-[#00b96b]' : 'text-[#1677ff] hover:underline'}`}
                  {...props}
                >
                  {children}
                  {!isWiki && <ExternalLink size={12} className="inline ml-1 opacity-50" />}
                </a>
              );
            },
            img: WikiImage,
            hr: ({ node, ...props }) => <hr className="my-10 border-gray-100" {...props} />,
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-6">
                <table className="min-w-full border-collapse border border-gray-200 text-sm" {...props} />
              </div>
            ),
            th: ({ node, ...props }) => <th className="bg-gray-50 border border-gray-200 px-4 py-2 font-semibold text-left" {...props} />,
            td: ({ node, ...props }) => <td className="border border-gray-200 px-4 py-2" {...props} />,
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>

       <div className="h-24"></div>
    </div>
  );
};

export default MarkdownViewer;
