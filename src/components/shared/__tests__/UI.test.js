import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input, Select } from '../UI';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' }
  })
}));

describe('Input', () => {
  it('renders border-slate-500 by default (no error)', () => {
    const { container } = render(<Input value="" onChange={() => {}} />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('border-slate-500');
    expect(input).not.toHaveClass('border-rose-500');
  });

  it('renders border-rose-500 when error is true', () => {
    const { container } = render(<Input value="" onChange={() => {}} error={true} />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('border-rose-500');
    expect(input).toHaveClass('focus:ring-rose-400');
    expect(input).toHaveClass('focus:border-rose-500');
    expect(input).not.toHaveClass('border-slate-500');
  });

  it('renders border-slate-500 when error is false', () => {
    const { container } = render(<Input value="" onChange={() => {}} error={false} />);
    const input = container.querySelector('input');
    expect(input).toHaveClass('border-slate-500');
    expect(input).toHaveClass('focus:ring-sky-400');
    expect(input).toHaveClass('focus:border-sky-500');
  });

  it('passes through className alongside error styling', () => {
    const { container } = render(
      <Input value="" onChange={() => {}} error={true} className="text-center" />
    );
    const input = container.querySelector('input');
    expect(input).toHaveClass('border-rose-500');
    expect(input).toHaveClass('text-center');
  });
});

describe('Select', () => {
  const defaultOptions = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' }
  ];

  it('renders border-slate-500 by default (no error)', () => {
    const { container } = render(
      <Select value="" onChange={() => {}} options={defaultOptions} />
    );
    const select = container.querySelector('select');
    expect(select).toHaveClass('border-slate-500');
    expect(select).not.toHaveClass('border-rose-500');
  });

  it('renders border-rose-500 when error is true', () => {
    const { container } = render(
      <Select value="" onChange={() => {}} options={defaultOptions} error={true} />
    );
    const select = container.querySelector('select');
    expect(select).toHaveClass('border-rose-500');
    expect(select).toHaveClass('focus:ring-rose-400');
    expect(select).toHaveClass('focus:border-rose-500');
    expect(select).not.toHaveClass('border-slate-500');
  });

  it('renders border-slate-500 when error is false', () => {
    const { container } = render(
      <Select value="" onChange={() => {}} options={defaultOptions} error={false} />
    );
    const select = container.querySelector('select');
    expect(select).toHaveClass('border-slate-500');
    expect(select).toHaveClass('focus:ring-sky-500');
    expect(select).toHaveClass('focus:border-sky-500');
  });

  it('passes through className on wrapper div alongside error styling', () => {
    const { container } = render(
      <Select value="" onChange={() => {}} options={defaultOptions} error={true} className="mt-2" />
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('relative');
    expect(wrapper).toHaveClass('mt-2');
    const select = container.querySelector('select');
    expect(select).toHaveClass('border-rose-500');
  });
});
