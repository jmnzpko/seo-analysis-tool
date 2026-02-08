import React, { useState } from 'react';

interface SeoFormData {
  primaryKeyword: string;
  city: string;
  state: string;
  highRankingUrl: string;
  lowRankingUrl: string;
}

interface AnalysisFormProps {
  onSubmit: (data: SeoFormData) => void;
  isLoading: boolean;
}

export const AnalysisForm: React.FC<AnalysisFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<SeoFormData>({
    primaryKeyword: '',
    city: '',
    state: '',
    highRankingUrl: '',
    lowRankingUrl: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid = 
    formData.primaryKeyword.trim() &&
    formData.city.trim() &&
    formData.state.trim() &&
    formData.highRankingUrl.trim() &&
    formData.lowRankingUrl.trim();

  return (
    <form onSubmit={handleSubmit} className="analysis-form">
      <div className="form-group">
        <label htmlFor="primaryKeyword">Primary Keyword</label>
        <input
          type="text"
          id="primaryKeyword"
          name="primaryKeyword"
          value={formData.primaryKeyword}
          onChange={handleChange}
          placeholder="e.g., car accident lawyer"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="city">Target City</label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="e.g., Austin"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="state">Target State</label>
          <input
            type="text"
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="e.g., TX"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="highRankingUrl">High-Ranking Page URL</label>
        <input
          type="url"
          id="highRankingUrl"
          name="highRankingUrl"
          value={formData.highRankingUrl}
          onChange={handleChange}
          placeholder="https://example.com/high-ranking-page"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="lowRankingUrl">Low-Ranking Page URL</label>
        <input
          type="url"
          id="lowRankingUrl"
          name="lowRankingUrl"
          value={formData.lowRankingUrl}
          onChange={handleChange}
          placeholder="https://example.com/low-ranking-page"
          required
        />
      </div>

      <button type="submit" disabled={!isFormValid || isLoading}>
        {isLoading ? 'Analyzing...' : 'Generate Analysis'}
      </button>
    </form>
  );
};

export type { SeoFormData };
