import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileText, ExternalLink, Clock, Edit2, Save, X, Tag, Calendar, User, AlignLeft, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
  fileName: string;
  lastModified?: number;
  onLinkClick: (href: string) => void;
  onResolveImage?: (src: string) => Promise<string | null>;
  onSave?: (content: string) => void;
  isEditable?: boolean;
}

interface OutlineItem {
  id: string;
  text: string;
  level: number;
}

// --- Utils ---

const generateId = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'heading';
};

const stripMarkdown = (text: string) => {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
};

const parseYamlValue = (val: string) => {
  val = val.trim();
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null') return null;
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
     return val.slice(1, -1);
  }
  if (val.startsWith('[') && val.endsWith(']')) {
      const content = val.slice(1, -1).trim();
      if (!content) return [];
      return content.split(',').map(v => parseYamlValue(v));
  }
  return val;
};

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
    const indentLevel = line.search(/\S|$/);
    const trimmed = line.trim();
    const separatorIndex = trimmed.indexOf(':');
    
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const valueStr = trimmed.slice(separatorIndex + 1).trim();

    if (indentLevel === 0) {
      if (valueStr === '') {
        currentKey = key;
        currentObj = {};
        metadata[key] = currentObj;
      } else {
        currentKey = '';
        currentObj = null;
        metadata[key] = parseYamlValue(valueStr);
      }
    } else if (indentLevel > 0 && currentObj) {
      currentObj[key] = parseYamlValue(valueStr);
    }
  }
  const content = text.replace(pattern, '').trim();
  return { metadata, content };
};

// --- Components ---

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

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ 
  content, 
  fileName, 
  lastModified, 
  onLinkClick,
  onResolveImage,
  onSave,
  isEditable = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isMetaExpanded, setIsMetaExpanded] = useState(false);

  useEffect(() => {
    setEditContent(content);
    setIsEditing(false);
  }, [content, fileName]);

  const handleSave = () => {
    if (onSave) {
      onSave(editContent);
      setIsEditing(false);
    }
  };

  const { metadata, processedContent } = useMemo(() => {
    if (!content) return { metadata: null, processedContent: '' };
    const { metadata, content: rawBody } = parseFrontmatter(content);
    let cleanedContent = rawBody.replace(/<!--[\s\S]*?-->/g, '');
    
    // Process WikiLinks
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

  // Extract Outline
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

  // Scroll Spy
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
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      let active = true;
      setLoading(true);
      setHasError(false);
      const load = async () => {
        try {
            if (src && src.startsWith('wikiimage:')) {
              const rawName = src.replace('wikiimage:', '');
              const imageName = decodeURIComponent(rawName);
              const url = onResolveImage ? await onResolveImage(imageName) : null;
              if (active) {
                if (url) setImgUrl(url);
                else setHasError(true);
                setLoading(false);
              }
            } else if (onResolveImage && !src.startsWith('http') && !src.startsWith('data:')) {
                const url = await onResolveImage(src);
                if (active) {
                    if (url) setImgUrl(url);
                    else setImgUrl(src); 
                    setLoading(false);
                }
            } else {
              setImgUrl(src);
              setLoading(false);
            }
        } catch (e) {
            if (active) { setHasError(true); setLoading(false); }
        }
      };
      load();
      return () => { active = false; };
    }, [src, onResolveImage]);

    if (loading) return <div className="bg-gray-50 h-32 rounded-lg flex items-center justify-center text-xs text-gray-400">Loading Image...</div>;
    if (hasError) return <div className="text-red-400 text-xs flex items-center bg-red-50 p-2 rounded"><AlertCircle size={12} className="mr-1"/> Image Failed</div>;

    return <img src={imgUrl || src} alt={alt} className="max-w-full h-auto rounded shadow-sm border border-gray-100 mx-auto my-4" onError={() => setHasError(true)} {...props} />;
  };

  const HeadingRenderer = ({ level, children, ...props }: any) => {
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

  // --- Render ---

  if (!content && !isEditing) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText size={64} className="mb-4 opacity-20" />
            <p className="text-lg">选择文档开始阅读</p>
        </div>
     );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
             <FileText size={20} />
          </div>
          <div className="flex flex-col overflow-hidden">
             <h1 className="text-xl font-bold text-gray-800 truncate" title={fileName}>
                {fileName.replace('.md', '')}
             </h1>
             <div className="flex items-center text-xs text-gray-400 gap-3">
                 {lastModified && (
                     <span className="flex items-center gap-1">
                         <Clock size={10} />
                         {new Date(lastModified).toLocaleDateString()}
                     </span>
                 )}
                 {metadata?.author && (
                     <span className="flex items-center gap-1">
                         <User size={10} />
                         {metadata.author}
                     </span>
                 )}
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {isEditable && !isEditing && (
                <button 
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-gray-500 hover:bg-gray-100 hover:text-[#00b96b] rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                    <Edit2 size={16} />
                    <span className="hidden sm:inline">编辑</span>
                </button>
            )}
             {isEditing && (
                <>
                    <button 
                        onClick={() => { setIsEditing(false); setEditContent(content); }}
                        className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                        title="取消"
                    >
                        <X size={20} />
                    </button>
                    <button 
                        onClick={handleSave}
                        className="py-2 px-4 bg-[#00b96b] hover:bg-[#009456] text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                    >
                        <Save size={16} />
                        保存
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
            <div className="max-w-[850px] mx-auto px-8 py-12 pb-32">
                {isEditing ? (
                    <textarea 
                        className="w-full h-[calc(100vh-200px)] p-4 font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00b96b] focus:border-transparent outline-none resize-none"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Start writing..."
                    />
                ) : (
                    <>
                        {/* Title & Metadata Block */}
                        <div className="mb-6 border-b border-gray-100 pb-6">
                            <h1 className="text-4xl font-bold text-[#262626] mb-4 leading-tight">{metadata?.title || fileName.replace('.md', '')}</h1>
                            
                            {(metadata || lastModified) && (
                                <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden transition-all duration-300">
                                    <div className="flex flex-wrap items-center gap-y-2 gap-x-6 px-4 py-3 text-sm text-gray-500">
                                        {metadata?.date && <div className="flex items-center"><Calendar size={14} className="mr-1.5 opacity-70"/><span>{metadata.date}</span></div>}
                                        {metadata?.tags && (
                                            <div className="flex items-center">
                                                <Tag size={14} className="mr-1.5 opacity-70"/>
                                                <div className="flex gap-1 flex-wrap">
                                                    {(Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags]).map((tag: string, idx: number) => (
                                                        <span key={idx} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs">#{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {metadata && (
                                            <button 
                                                onClick={() => setIsMetaExpanded(!isMetaExpanded)}
                                                className="ml-auto p-1 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
                                            >
                                                {isMetaExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        )}
                                    </div>
                                    {metadata && isMetaExpanded && (
                                        <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50">
                                            <MetadataRenderer data={metadata} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Rendering */}
                        <div className="text-[#262626] leading-relaxed text-[16px]">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                urlTransform={(url) => url}
                                components={{
                                    h1: (props) => <HeadingRenderer level={1} {...props} />,
                                    h2: (props) => <HeadingRenderer level={2} {...props} />,
                                    h3: (props) => <HeadingRenderer level={3} {...props} />,
                                    h4: (props) => <HeadingRenderer level={4} {...props} />,
                                    p: (props) => <p className="mb-4 leading-7 text-justify text-[#262626] break-words" {...props} />,
                                    ul: (props) => <ul className="list-disc pl-6 mb-4 space-y-1 text-gray-700" {...props} />,
                                    ol: (props) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-gray-700" {...props} />,
                                    blockquote: (props) => <blockquote className="border-l-4 border-[#00b96b] pl-4 py-2 my-4 bg-green-50/30 text-gray-600 rounded-r text-sm italic" {...props} />,
                                    table: (props) => <div className="overflow-x-auto my-6 rounded-lg border border-gray-200"><table className="min-w-full divide-y divide-gray-200 text-sm" {...props} /></div>,
                                    th: (props) => <th className="bg-gray-50 px-4 py-3 font-semibold text-left text-gray-700" {...props} />,
                                    td: (props) => <td className="px-4 py-3 border-t border-gray-100 text-gray-600" {...props} />,
                                    img: WikiImage,
                                    a: ({ node, href, children, ...props }) => {
                                        const isWiki = href?.startsWith('wikilink:');
                                        return (
                                            <a 
                                                href={href}
                                                onClick={(e) => { if (isWiki) { e.preventDefault(); onLinkClick(href); }}}
                                                className={`cursor-pointer transition-colors ${isWiki ? 'text-[#00b96b] hover:text-[#009456] font-medium' : 'text-[#1677ff] hover:underline'}`}
                                                {...props}
                                            >
                                                {children}
                                                {!isWiki && <ExternalLink size={12} className="inline ml-1 opacity-50" />}
                                            </a>
                                        );
                                    },
                                    code: ({ node, className, children, ...props }: any) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const isInline = !match && !String(children).includes('\n');
                                        if (isInline) return <code className="bg-gray-100 text-[#d4380d] px-1.5 py-0.5 rounded text-sm font-mono mx-1" {...props}>{children}</code>;
                                        return (
                                            <div className="my-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm text-sm">
                                                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 text-xs text-gray-500 font-mono flex items-center">
                                                    <div className="flex gap-1.5 mr-2"><div className="w-2.5 h-2.5 rounded-full bg-red-400/20"></div><div className="w-2.5 h-2.5 rounded-full bg-yellow-400/20"></div><div className="w-2.5 h-2.5 rounded-full bg-green-400/20"></div></div>
                                                    {match ? match[1] : 'text'}
                                                </div>
                                                <SyntaxHighlighter style={prism as any} language={match ? match[1] : 'text'} PreTag="div" customStyle={{ margin: 0, borderRadius: 0, backgroundColor: '#fdfdfd' }} {...props}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                                            </div>
                                        );
                                    }
                                }}
                            >
                                {processedContent}
                            </ReactMarkdown>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Right Sidebar (TOC) - Desktop Only */}
        {!isEditing && outline.length > 0 && (
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
    </div>
  );
};

export default MarkdownViewer;