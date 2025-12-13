import React, { useMemo, useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileText, ExternalLink, AlertCircle, List, Tag, Calendar, User, AlignLeft, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
  fileName: string;
  lastModified?: number;
  onLinkClick: (href: string) => void;
  onResolveImage: (src: string) => Promise<string | null>;
}

interface OutlineItem {
  id: string;
  text: string;
  level: number;
}

// 工具函数：生成标准化的 ID
const generateId = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-') // 替换非字母数字和非中文为短横线
    .replace(/^-+|-+$/g, '') // 去除首尾短横线
    || 'heading'; // 防止空 ID
};

// 工具函数：去除 Markdown 语法，获取纯文本
const stripMarkdown = (text: string) => {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 移除图片
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接转文字
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // 粗体
    .replace(/(\*|_)(.*?)\1/g, '$2') // 斜体
    .replace(/`([^`]+)`/g, '$1') // 行内代码
    .replace(/<!--[\s\S]*?-->/g, '') // 移除 HTML 注释
    .trim();
};

// 辅助函数：解析 YAML 值
const parseYamlValue = (val: string) => {
  val = val.trim();
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null') return null;
  // 去除引号
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
     return val.slice(1, -1);
  }
  // 数组 [a, b]
  if (val.startsWith('[') && val.endsWith(']')) {
      const content = val.slice(1, -1).trim();
      if (!content) return [];
      return content.split(',').map(v => parseYamlValue(v));
  }
  return val;
};

// 增强版 YAML 解析器 (支持简单的嵌套)
const parseFrontmatter = (text: string) => {
  const pattern = /^---\n([\s\S]*?)\n---/;
  const match = text.match(pattern);
  
  if (!match) {
    return { metadata: null, content: text };
  }

  const yamlLines = match[1].split('\n');
  const metadata: Record<string, any> = {};
  
  let currentObj: any = null;
  let currentKey: string = '';

  for (const line of yamlLines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indentLevel = line.search(/\S|$/); // 获取缩进级别
    const trimmed = line.trim();
    const separatorIndex = trimmed.indexOf(':');
    
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const valueStr = trimmed.slice(separatorIndex + 1).trim();

    if (indentLevel === 0) {
      // 顶层键
      if (valueStr === '') {
        // 开始一个新对象 (例如 halo:)
        currentKey = key;
        currentObj = {};
        metadata[key] = currentObj;
      } else {
        // 普通值
        currentKey = '';
        currentObj = null;
        metadata[key] = parseYamlValue(valueStr);
      }
    } else if (indentLevel > 0 && currentObj) {
      // 嵌套属性 (简单的二级嵌套)
      currentObj[key] = parseYamlValue(valueStr);
    }
  }

  const content = text.replace(pattern, '').trim();
  return { metadata, content };
};

const MetadataRenderer = ({ data, level = 0 }: { data: any, level?: number }) => {
  if (typeof data !== 'object' || data === null) {
    return <span>{String(data)}</span>;
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-400 italic">空</span>;
    return (
      <div className="flex gap-1 flex-wrap">
        {data.map((item, idx) => (
          <span key={idx} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${level > 0 ? 'mt-1' : ''}`}>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex items-start text-sm">
           <span className="text-gray-500 mr-2 min-w-[80px] shrink-0 font-medium select-none">{key}:</span>
           <div className="flex-1 break-all text-gray-700">
             <MetadataRenderer data={value} level={level + 1} />
           </div>
        </div>
      ))}
    </div>
  );
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, fileName, lastModified, onLinkClick, onResolveImage }) => {
  const displayTitle = fileName.replace(/\.md$/i, '');
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isMetaExpanded, setIsMetaExpanded] = useState(false);

  // 解析 Frontmatter 和 Wiki Links
  const { metadata, processedContent } = useMemo(() => {
    if (!content) return { metadata: null, processedContent: '' };
    
    // 1. 分离元数据
    const { metadata, content: rawBody } = parseFrontmatter(content);

    // 2. 移除 HTML 注释 (<!-- ... -->)
    // 必须在处理 Markdown 之前移除，否则可能被部分渲染
    let cleanedContent = rawBody.replace(/<!--[\s\S]*?-->/g, '');

    // 3. 处理双链
    const processed = cleanedContent.replace(/(!?)\[\[(.*?)(?:\|(.*?))?\]\]/g, (match, isEmbed, link, alias) => {
      const target = link.trim();
      const text = alias ? alias.trim() : target;
      if (isEmbed) {
        return `![${text}](wikiimage:${target})`;
      } else {
        return `[${text}](wikilink:${target})`;
      }
    });

    return { metadata, processedContent: processed };
  }, [content]);

  // 提取大纲
  useEffect(() => {
    if (!processedContent) {
      setOutline([]);
      return;
    }

    const headingRegex = /^(#{1,4})\s+(.+)$/gm;
    const items: OutlineItem[] = [];
    let match;
    
    while ((match = headingRegex.exec(processedContent)) !== null) {
      const level = match[1].length;
      const rawText = match[2].trim();
      const text = stripMarkdown(rawText);
      const id = generateId(text);
      items.push({ id, text, level });
    }
    setOutline(items);
  }, [processedContent]);

  // 监听滚动以高亮大纲
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-10% 0px -80% 0px' }
    );

    outline.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [outline]);


  const WikiImage = ({ src, alt, ...props }: any) => {
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let isMounted = true;
      const load = async () => {
        if (src && src.startsWith('wikiimage:')) {
          const rawName = src.replace('wikiimage:', '');
          const imageName = decodeURIComponent(rawName);
          const url = await onResolveImage(imageName);
          if (isMounted) {
            setImgUrl(url);
            setLoading(false);
          }
        } else {
          setImgUrl(src);
          setLoading(false);
        }
      };
      load();
      return () => { isMounted = false; };
    }, [src]);

    if (loading) return <div className="bg-gray-50 h-32 rounded-lg flex items-center justify-center text-xs text-gray-400">加载中...</div>;
    if (!imgUrl) return <div className="text-red-400 text-xs flex items-center bg-red-50 p-2 rounded"><AlertCircle size={12} className="mr-1"/> 图片失效</div>;

    return (
      <span className="block my-4">
        <img src={imgUrl} className="max-w-full h-auto rounded shadow-sm border border-gray-100 mx-auto" alt={alt} {...props} />
        {alt && !alt.endsWith('.png') && <span className="block text-center text-xs text-gray-400 mt-2">{alt}</span>}
      </span>
    );
  };

  const HeadingRenderer = ({ level, children, ...props }: any) => {
     // 递归获取纯文本内容用于生成 ID
     const getText = (node: any): string => {
        if (typeof node === 'string') return node;
        if (Array.isArray(node)) return node.map(getText).join('');
        if (node.props && node.props.children) return getText(node.props.children);
        return '';
     };
     
     const text = getText(children);
     const id = generateId(text);
     const Tag = `h${level}` as React.ElementType;
     
     const styles = ({
         1: "text-3xl font-bold mt-10 mb-6 pb-2 border-b border-gray-100",
         2: "text-2xl font-bold mt-8 mb-4",
         3: "text-xl font-bold mt-6 mb-3",
         4: "text-lg font-bold mt-4 mb-2",
         5: "font-bold mt-3",
         6: "font-bold mt-3 text-gray-500"
     } as any)[level] || "";

     return <Tag id={id} className={`scroll-mt-20 ${styles}`} {...props}>{children}</Tag>;
  };

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <FileText size={64} className="mb-4 opacity-20" />
        <p className="text-lg">选择左侧文档开始阅读</p>
      </div>
    );
  }

  // 检查是否有任何核心元数据需要显示
  const hasBasicMeta = metadata && (metadata.date || metadata.updated || metadata.author || (metadata.tags && metadata.tags.length > 0));

  return (
    <div className="flex h-full animate-fade-in relative">
        {/* 文档阅读主体区域 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="w-full max-w-[850px] mx-auto px-8 py-12">
                
                {/* 标题区 */}
                <div className="mb-6 border-b border-gray-100 pb-6">
                    <h1 className="text-4xl font-bold text-[#262626] mb-4 leading-tight">{metadata?.title || displayTitle}</h1>
                    
                    {/* 元信息展示区域 */}
                    {(metadata || lastModified) && (
                        <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden transition-all duration-300">
                            {/* 默认折叠视图：只显示核心信息 */}
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 px-4 py-3 text-sm text-gray-500">
                                {/* 创建时间 */}
                                {metadata?.date && (
                                    <div className="flex items-center" title="创建时间">
                                        <Calendar size={14} className="mr-1.5 opacity-70"/>
                                        <span>{metadata.date}</span>
                                    </div>
                                )}
                                {/* 更新时间 */}
                                {metadata?.updated && (
                                    <div className="flex items-center" title="更新时间">
                                        <Clock size={14} className="mr-1.5 opacity-70"/>
                                        <span>{metadata.updated}</span>
                                    </div>
                                )}
                                {/* 作者 */}
                                {metadata?.author && (
                                    <div className="flex items-center" title="作者">
                                        <User size={14} className="mr-1.5 opacity-70"/>
                                        <span>{metadata.author}</span>
                                    </div>
                                )}
                                {/* 标签 */}
                                {metadata?.tags && metadata.tags.length > 0 && (
                                    <div className="flex items-center">
                                        <Tag size={14} className="mr-1.5 opacity-70"/>
                                        <div className="flex gap-1 flex-wrap">
                                            {(Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags]).map((tag: string, idx: number) => (
                                                <span key={idx} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs hover:bg-blue-100 transition-colors cursor-default">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Fallback: 如果没有 Metadata，显示文件修改时间 */}
                                {!hasBasicMeta && lastModified && !metadata?.date && (
                                     <div className="flex items-center text-xs text-gray-400">
                                        <Clock size={14} className="mr-1.5 opacity-70"/>
                                        编辑于 {new Date(lastModified).toLocaleDateString()}
                                     </div>
                                )}

                                {/* 展开/收起按钮 - 仅当有 Metadata 时显示 */}
                                {metadata && (
                                  <button 
                                    onClick={() => setIsMetaExpanded(!isMetaExpanded)}
                                    className="ml-auto p-1 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
                                    title={isMetaExpanded ? "收起详细信息" : "展开详细信息"}
                                  >
                                    {isMetaExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                )}
                            </div>

                            {/* 展开视图：显示所有详细信息 */}
                            {metadata && isMetaExpanded && (
                                <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50 animate-fade-in">
                                    <MetadataRenderer data={metadata} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 正文内容 */}
                <div className="text-[#262626] leading-relaxed text-[16px]">
                    <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h1: (props) => <HeadingRenderer level={1} {...props} />,
                        h2: (props) => <HeadingRenderer level={2} {...props} />,
                        h3: (props) => <HeadingRenderer level={3} {...props} />,
                        h4: (props) => <HeadingRenderer level={4} {...props} />,
                        p: ({ node, ...props }) => <p className="mb-4 leading-7 text-justify text-[#262626]" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1 text-gray-700" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-gray-700" {...props} />,
                        blockquote: ({ node, ...props }) => (
                            <blockquote className="border-l-4 border-[#00b96b] pl-4 py-2 my-4 bg-green-50/30 text-gray-600 rounded-r text-sm italic" {...props} />
                        ),
                        code: ({ node, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match && !String(children).includes('\n');
                            
                            // 排除 ref 属性
                            const { ref, ...rest } = props as any;

                            return isInline ? (
                                <code className="bg-gray-100 text-[#d4380d] px-1.5 py-0.5 rounded text-sm font-mono mx-1" {...props}>
                                    {children}
                                </code>
                            ) : (
                                <div className="my-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm text-sm">
                                    <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 text-xs text-gray-500 font-mono flex items-center">
                                        <div className="flex gap-1.5 mr-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400/20"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/20"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-400/20"></div>
                                        </div>
                                        {match ? match[1] : 'text'}
                                    </div>
                                    <SyntaxHighlighter
                                        style={prism as any}
                                        language={match ? match[1] : 'text'}
                                        PreTag="div"
                                        customStyle={{ margin: 0, borderRadius: 0, backgroundColor: '#fdfdfd' }}
                                        {...rest}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                </div>
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
                                className={`cursor-pointer transition-colors ${isWiki ? 'text-[#00b96b] hover:text-[#009456] font-medium' : 'text-[#1677ff] hover:underline'}`}
                                {...props}
                                >
                                {children}
                                {!isWiki && <ExternalLink size={12} className="inline ml-1 opacity-50" />}
                                </a>
                            );
                        },
                        img: WikiImage,
                        table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-6 rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-sm" {...props} />
                            </div>
                        ),
                        th: ({ node, ...props }) => <th className="bg-gray-50 px-4 py-3 font-semibold text-left text-gray-700" {...props} />,
                        td: ({ node, ...props }) => <td className="px-4 py-3 border-t border-gray-100 text-gray-600" {...props} />,
                    }}
                    >
                    {processedContent}
                    </ReactMarkdown>
                </div>
                <div className="h-32"></div>
            </div>
        </div>

        {/* 右侧大纲栏 (Desktop Only) - 使用 lg:block 适配更多屏幕 */}
        {outline.length > 0 && (
            <div className="hidden lg:block w-64 border-l border-gray-100 bg-[#fafafa] flex-shrink-0">
                <div className="sticky top-0 h-full overflow-y-auto custom-scrollbar">
                    <div className="p-4">
                        <div className="flex items-center text-gray-500 mb-4 px-2">
                            <AlignLeft size={16} className="mr-2"/>
                            <span className="text-xs font-bold uppercase tracking-wider">大纲</span>
                        </div>
                        <ul className="space-y-0.5">
                            {outline.map((item) => (
                                <li key={item.id}>
                                    <a 
                                        href={`#${item.id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                                            setActiveId(item.id);
                                        }}
                                        className={`block text-sm py-1.5 pr-2 transition-colors border-l-2
                                            ${item.level === 1 ? 'pl-3 font-medium' : ''}
                                            ${item.level === 2 ? 'pl-6' : ''}
                                            ${item.level === 3 ? 'pl-9' : ''}
                                            ${item.level >= 4 ? 'pl-11' : ''}
                                            ${activeId === item.id 
                                                ? 'border-[#00b96b] text-[#00b96b] bg-white shadow-sm' 
                                                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'}
                                        `}
                                    >
                                        <span className="truncate block">{item.text}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default MarkdownViewer;