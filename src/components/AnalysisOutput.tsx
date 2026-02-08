import React from 'react';

interface AnalysisResult {
  sectionA: string;
  sectionB: string;
  sectionC: string;
  rawOutput: string;
}

interface AnalysisOutputProps {
  result: AnalysisResult | null;
}

export const AnalysisOutput: React.FC<AnalysisOutputProps> = ({ result }) => {
  if (!result) {
    return null;
  }

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let inList = false;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('### ')) {
        if (inList) {
          elements.push(<ul key={`ul-${index}`}>{listItems.map((item, i) => <li key={i}>{item}</li>)}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<h3 key={index}>{trimmedLine.replace('### ', '')}</h3>);
      } else if (trimmedLine.startsWith('## ')) {
        if (inList) {
          elements.push(<ul key={`ul-${index}`}>{listItems.map((item, i) => <li key={i}>{item}</li>)}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<h2 key={index}>{trimmedLine.replace('## ', '')}</h2>);
      } else if (trimmedLine.startsWith('# ')) {
        if (inList) {
          elements.push(<ul key={`ul-${index}`}>{listItems.map((item, i) => <li key={i}>{item}</li>)}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<h1 key={index}>{trimmedLine.replace('# ', '')}</h1>);
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        inList = true;
        listItems.push(trimmedLine.replace(/^[-*]\s/, ''));
      } else if (trimmedLine.includes('**')) {
        if (inList) {
          elements.push(<ul key={`ul-${index}`}>{listItems.map((item, i) => <li key={i}>{item}</li>)}</ul>);
          listItems = [];
          inList = false;
        }
        const parts = trimmedLine.split('**');
        const rendered = parts.map((part, i) => 
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        );
        elements.push(<p key={index}>{rendered}</p>);
      } else if (trimmedLine === '') {
        if (inList) {
          elements.push(<ul key={`ul-${index}`}>{listItems.map((item, i) => <li key={i}>{item}</li>)}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<br key={index} />);
      } else if (trimmedLine.length > 0) {
        if (inList) {
          elements.push(<ul key={`ul-${index}`}>{listItems.map((item, i) => <li key={i}>{item}</li>)}</ul>);
          listItems = [];
          inList = false;
        }
        elements.push(<p key={index}>{trimmedLine}</p>);
      }
    });

    if (inList && listItems.length > 0) {
      elements.push(<ul key="ul-final">{listItems.map((item, i) => <li key={i}>{item}</li>)}</ul>);
    }

    return elements;
  };

  return (
    <div className="analysis-output">
      <h2 className="output-title">SEO Analysis Results</h2>

      <section className="output-section section-a">
        <h2 className="section-header">A) Algorithmically Important Content</h2>
        <div className="section-content">
          {renderContent(result.sectionA)}
        </div>
      </section>

      <section className="output-section section-b">
        <h2 className="section-header">B) Missing or Weak Content Signals</h2>
        <div className="section-content">
          {renderContent(result.sectionB)}
        </div>
      </section>

      <section className="output-section section-c">
        <h2 className="section-header">C) Search-Engine-Optimized Content Additions</h2>
        <div className="section-content">
          {renderContent(result.sectionC)}
        </div>
      </section>
    </div>
  );
};

export type { AnalysisResult };
