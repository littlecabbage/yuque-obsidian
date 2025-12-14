import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileText, ExternalLink, AlertCircle, Calendar, User, AlignLeft, ChevronDown, ChevronUp, Clock, Edit2, Save, X, Tag } from 'lucide-react';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  content: string;
  fileName: string;
  lastModified?: number;
  onLinkClick: (href: string