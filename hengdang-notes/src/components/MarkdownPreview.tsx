import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MarkdownPreviewProps {
    content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
    // Process wiki-style links [[Note Name]]
    const processWikiLinks = (text: string) => {
        return text.replace(/\[\[([^\]]+)\]\]/g, (match, noteName) => {
            return `[${noteName}](#wiki-${noteName.replace(/\s+/g, '-').toLowerCase()})`;
        });
    };

    const processedContent = processWikiLinks(content);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-white dark:bg-gray-900">
            <div className="max-w-none p-6">
                <ReactMarkdown
                    className="markdown-content prose prose-lg dark:prose-invert max-w-none"
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                        a: ({ href, children, ...props }) => {
                            if (href?.startsWith('#wiki-')) {
                                return (
                                    <a
                                        {...props}
                                        href={href}
                                        className="wiki-link"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            console.log('Wiki link clicked:', children);
                                            // TODO: Handle wiki link navigation
                                        }}
                                    >
                                        {children}
                                    </a>
                                );
                            }
                            return (
                                <a
                                    {...props}
                                    href={href}
                                    target={href?.startsWith('http') ? '_blank' : undefined}
                                    rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                                >
                                    {children}
                                </a>
                            );
                        },
                        code: ({ className, children, ...props }) => {
                            return (
                                <code
                                    {...props}
                                    className={`${className || ''} font-mono text-sm`}
                                >
                                    {children}
                                </code>
                            );
                        },
                    }}
                >
                    {processedContent}
                </ReactMarkdown>
            </div>
        </div>
    );
};
