import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input, Select, Textarea } from '../UI';

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

describe('Textarea', () => {
  it('renders border-slate-600 by default (no error)', () => {
    const { container } = render(<Textarea value="" onChange={() => {}} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveClass('border-slate-600');
    expect(textarea).not.toHaveClass('border-rose-500');
  });

  it('renders border-rose-500 when error is true', () => {
    const { container } = render(<Textarea value="" onChange={() => {}} error={true} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveClass('border-rose-500');
    expect(textarea).toHaveClass('focus:ring-rose-400');
    expect(textarea).not.toHaveClass('border-slate-600');
  });

  it('renders border-slate-600 when error is false', () => {
    const { container } = render(<Textarea value="" onChange={() => {}} error={false} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveClass('border-slate-600');
    expect(textarea).toHaveClass('focus:ring-sky-500');
  });

  it('passes through className alongside error styling', () => {
    const { container } = render(
      <Textarea value="" onChange={() => {}} error={true} className="mt-4" />
    );
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveClass('border-rose-500');
    expect(textarea).toHaveClass('mt-4');
  });

  it('defaults to 3 rows', () => {
    const { container } = render(<Textarea value="" onChange={() => {}} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveAttribute('rows', '3');
  });

  it('accepts custom rows prop', () => {
    const { container } = render(<Textarea value="" onChange={() => {}} rows={5} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('has resize-none class', () => {
    const { container } = render(<Textarea value="" onChange={() => {}} />);
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveClass('resize-none');
  });

  it('passes through additional props', () => {
    const { container } = render(
      <Textarea value="" onChange={() => {}} maxLength={500} disabled />
    );
    const textarea = container.querySelector('textarea');
    expect(textarea).toHaveAttribute('maxlength', '500');
    expect(textarea).toBeDisabled();
  });
});
