/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PageLayout = '1-up' | '2-up' | '4-up' | '6-up' | '9-up';

export type PaperSize = 'A4' | 'Letter';

export type PaperOrientation = 'portrait' | 'landscape';

export interface NUpCard {
  id: string;
  title: string;
  content: string;
  order: number;
  accentColor: string;
}

export interface MergedFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  file: File;
  order: number;
}

export interface ImageSlide {
  id: string;
  name: string;
  url: string;
  size: number;
  file: File;
  borderStyle: 'none' | 'polaroid' | 'classic';
  order: number;
}
