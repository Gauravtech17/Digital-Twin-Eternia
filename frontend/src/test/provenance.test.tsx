import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProvenanceBadge } from '../components/common/ProvenanceBadge';

describe('ProvenanceBadge Claims Policy Compliance', () => {
  it('renders MANUAL badge with correct styling and label', () => {
    render(<ProvenanceBadge type="MANUAL" />);
    const badge = screen.getByText('MANUAL');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', 'Directly input by user or medical clinician');
  });

  it('renders DERIVED badge identifying formula provenance', () => {
    render(<ProvenanceBadge type="DERIVED" />);
    const badge = screen.getByText('DERIVED');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', 'Computed via mathematical formula (e.g. ellipsoid formula)');
  });

  it('renders SIMULATED badge clearly identifying software simulation', () => {
    render(<ProvenanceBadge type="SIMULATED" />);
    const badge = screen.getByText('SIMULATED');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', 'Software simulation of a proposed wearable ultrasound source');
  });

  it('renders PREDICTED badge with experimental projection label', () => {
    render(<ProvenanceBadge type="PREDICTED" />);
    const badge = screen.getByText('PREDICTED');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('title', 'Experimental baseline projection with statistical uncertainty interval');
  });

  it('renders ILLUSTRATIVE badge emphasizing non-reconstruction anatomy', () => {
    render(<ProvenanceBadge type="ILLUSTRATIVE" />);
    const badge = screen.getByText('ILLUSTRATIVE');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'title',
      'Procedural anatomical illustration — not a patient-specific organ reconstruction'
    );
  });
});
