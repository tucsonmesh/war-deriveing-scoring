import {
  BLOCKGROUP,
  SUPERNODEDIST,
  getInitialTeamScores,
  MeasurementRow,
  TeamScore,
} from '../src/index';

import { describe, expect, it } from '@jest/globals';

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

  describe('getInitialTeamScores', () => {
    const testData: MeasurementRow[] = [
      [
        'cf1c2f02',
        '2slow2fail',
        'Tucson House',
        -65,
        '32.242426, -110.972476',
        '',
        '',
        '',
        '040190013022',
        0.6637975665,
        'Twin Towers, Longest Dance Party/Karaoke',
      ],
      [
        'f583f14e',
        'Tucson Wireless Commons',
        'Tucson House',
        -54,
        '32.240049, -110.983548',
        '',
        '',
        '',
        '040190012001',
        0.4185136178,
        '',
      ],
      [
        '62b4adbe',
        'Tucson Wireless Commons',
        'Tucson House',
        -65,
        '32.240249, -110.981660',
        '',
        '',
        '',
        '040190013021',
        0.2396902866,
        '',
      ],
      [
        'd4a35e95',
        '9/11s',
        'Tucson House',
        -65,
        '32.240249, -110.981660',
        '',
        '',
        '',
        '040190013021',
        0.2396902866,
        '',
      ],
    ];

    it('Returns an empty array when called on an empty array', () => {
      expect(getInitialTeamScores([])).toHaveLength(0);
    });

    it('Returns one record for each team', () => {
      const teamScores = getInitialTeamScores(testData);
      expect(teamScores).toHaveLength(3);
      const teamNames = teamScores.map((t: TeamScore) => t.teamName);
      expect(teamNames).toContain('2slow2fail');
      expect(teamNames).toContain('Tucson Wireless Commons');
      expect(teamNames).toContain('9/11s');
    });

    it('Adds 10 points for each measurement', () => {
      const testData: MeasurementRow[] = [
        [
          'f583f14e',
          'Tucson Wireless Commons',
          'Tucson House',
          // Force a very bad signal to not get the bonus
          -80,
          '32.240049, -110.983548',
          '',
          '',
          '',
          '040190012001',
          0.4185136178,
          '',
        ],
        [
          '62b4adbe',
          'Tucson Wireless Commons',
          'Tucson House',
          // Force a very bad signal to not get the bonus
          -88,
          '32.240249, -110.981660',
          '',
          '',
          '',
          '040190013021',
          0.2396902866,
          '',
        ],
      ];

      const teamScores = getInitialTeamScores(testData);

      expect(teamScores[0].total).toBe(10 * testData.length);
    });

    it('Adds an additional 10 points for a good signal', () => {
      const testData: MeasurementRow[] = [
        [
          'f583f14e',
          'Tucson Wireless Commons',
          'Tucson House',
          // Force a very bad signal to not get the bonus
          -80,
          '32.240049, -110.983548',
          '',
          '',
          '',
          '040190012001',
          0.4185136178,
          '',
        ],
        [
          '62b4adbe',
          'Tucson Wireless Commons',
          'Tucson House',
          // Force a good signal to get the bonus
          -50,
          '32.240249, -110.981660',
          '',
          '',
          '',
          '040190013021',
          0.2396902866,
          '',
        ],
      ];

      const teamScores = getInitialTeamScores(testData);

      expect(teamScores[0].total).toBe(30);
    });

    it("Records each team's maximum signal strength", () => {
      const teamScores = getInitialTeamScores(testData);
      const teamScore = teamScores.find(
        (t: TeamScore) => t.teamName === 'Tucson Wireless Commons'
      );
      expect(teamScore?.maxSignalStrength).toBe(-54);
    });

    it("Records each team's minimum signal strength", () => {
      const teamScores = getInitialTeamScores(testData);
      const teamScore = teamScores.find(
        (t: TeamScore) => t.teamName === 'Tucson Wireless Commons'
      );
      expect(teamScore?.minSignalStrength).toBe(-65);
    });

    it('Adds subjective bonuses', () => {
      const testData: MeasurementRow[] = [
        [
          'cf1c2f02',
          '2slow2fail',
          'Tucson House',
          -65,
          '32.242426, -110.972476',
          '',
          '',
          '',
          '040190013022',
          0.6637975665,
          'Location & Contact Info, Longest Dance Party/Karaoke',
        ],
      ];
      const teamScores = getInitialTeamScores(testData);
      const teamScore = teamScores[0];

      expect(teamScore.total).toBe(
        10 + // measurement
          10 + // good signal bonus
          20 + // Longest Dance Party/Karaoke bonus
          30 // Location & Contact info bonus
      );
    });

    it("Records all the block groups containing a team's measurements", () => {
      const teamScores = getInitialTeamScores(testData);
      const teamScore = teamScores.find(
        (t: TeamScore) => t.teamName === 'Tucson Wireless Commons'
      );
      expect(teamScore?.blockGroups).toContain('040190012001');
      expect(teamScore?.blockGroups).toContain('040190013021');
    });

    it('Records the maximum distance from a supernode at which a team measured a signal', () => {
      const teamScores = getInitialTeamScores(testData);
      const teamScore = teamScores.find(
        (t: TeamScore) => t.teamName === 'Tucson Wireless Commons'
      );

      expect(teamScore?.maxSupernodeDistance).toBe(0.4185136178);
    });
  });
});
