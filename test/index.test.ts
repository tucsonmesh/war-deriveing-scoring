/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BLOCKGROUP, SUPERNODEDIST } from '../src/index';

import 'jest';

describe('index', () => {
  describe('BLOCKGROUP', () => {
    it('Returns expected ID for a valid input', () => {
      expect(BLOCKGROUP(32.242426, -110.972476)).toBe('040190013022');
    });
  });

  describe('SUPERNODEDIST', () => {
    it('Returns the expected distance from Tucson House for a valid set of coordinates', () => {
      expect(SUPERNODEDIST(32.242426, -110.972476, 'Tucson House')).toBeCloseTo(
        0.6637975665
      );
    });
  });
});
