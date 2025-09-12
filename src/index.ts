/**
 * AppsScript functions for calculating scores for Tucson Mesh's War Dérive-ing event
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import * as turf from '@turf/turf';

import { BLOCK_GROUPS } from './block-groups';
import { Feature, FeatureCollection, Point, Polygon } from 'geojson';

/**
 * A team's score and information needed to calculate bonuses based on
 * comparisons with other teams.
 */
export interface TeamScore {
  teamName: string;
  total: number;
  nMeasurements: number;
  blockGroups: Set<string>;
  maxSupernodeDistance: number;
  maxSignalStrength: number;
  minSignalStrength: number;
}

/**
 * A raw signal strength measurement from the Google Sheet.
 */
export type MeasurementRow = [
  string, // ID
  string, // team name
  string, // supernode
  number, // signal strength
  string, // location
  string, // vibes
  string, // LiteBeam admin screenshot
  string, // Line of shight photo
  string, // block group geoid
  number, // distance from supernode
  string, // subjective bonuses
];

/**
 * A signal strength measurement.
 */
interface Measurement {
  teamName: string;
  supernode: string;
  signalStrength: number;
  blockGroup: string;
  supernodeDistance: number;
  subjectiveBonuses: string[];
}

/**
 * Maximum values for various score components.
 */
interface Maximums {
  nBlockGroups: number;
  nMeasurements: number;
  maxSupernodeDistance: number;
  maxSignalStrength: number;
  minSignalStrength: number;
}

// Constants for different scoring elements

// The measurement signal strength below which
const GOOD_SIGNAL_THRESHOLD = -70;
const POINTS_BY_TYPE: Record<string, number> = {
  'MEASUREMENT': 10,
  'GOOD_SIGNAL': 10,
  'MOST_MEASUREMENTS': 30,
  'MANY_AREAS': 40,
  'MOST_BLOCK_GROUPS': 50,
  'MAX_SUPERNODE_DISTANCE': 20,
  'MAX_SIGNAL_STRENGTH': 20,

  // Subjective bonuses
  // These keys should match the options in the spreadsheet
  // no injuries, no vehicle accidents
  'Safety': 50,
  // Measurement of -70 or better for both Tucson House and BICAS
  'Twin Towers': 50,
  // At least 4 measurements more than .5 miles from each other
  'Four Dispersed Measurements': 40,
  // Furthest distance between any two measurements
  'Furthest Distance Between Two Measurements': 20,
  // Furthest distance from any other team's measurement
  'Furthest Distance from Another Team Measurement': 20,
  // Most unhinged method of making a measurement
  // "Awarded per team by High Judge of the War Derive"
  'Most Unhinged Method': 0,
  'Longest Dance Party/Karaoke': 20,
  'Coolest Object': 20,
  'Worst Connection': 20,
  // Got address and contact information for someone interested in Tucson Mesh
  'Location & Contact Info': 30,
  // Measurement taken by team traveling without using fossil fuels: EV, ebike, hoverboard
  'No Fossil Fuels': 40,
  // Measurement taken by team traveling only human power: walking, skateboard, bicycle, etc.
  //'Human Powered': 20,
  // Measurement locations make a design
  // "Awarded per team by High Judge of the War Derive"
  'Best Pattern Made from Reading Points': 0,
  // "Awarded per team by High Judge of the War Derive"
  'Best Side Quest': 0,
  'Hit Others with Water Gun': 10,
  'Hit Equipment with Water Gun': -10,
  'Trespassing Ticket': 30,
};

/**
 * Determine the census block group containing the point
 *
 * @param {number} lat Latitude component of point's coordinates.
 * @param {number} lng Longitude component of point's coordinates.
 * @return {string} Geo ID of census block containing the point.
 * @customfunction
 */
export function BLOCKGROUP(lat: number, lng: number): string {
  const point = turf.point([lng, lat]);
  const tagged = turf.tag(
    turf.featureCollection([point]),
    BLOCK_GROUPS as FeatureCollection<Polygon>,
    'geoid20',
    'geoid20'
  );

  if (tagged.features.length === 0 || tagged.features[0] === null) {
    throw 'Could not get block group for coordinates';
  }

  return tagged.features[0].properties?.geoid20;
}

/**
 * Determine the distance to a supernode
 *
 * @param {number} lat Latitude component of point's coordinates.
 * @param {number} lng Longitude component of point's coordinates.
 * @param {string} supernode Name of supernode.
 * @return {number} Distince to supernode in miles.
 * @customfunction
 */
export function SUPERNODEDIST(
  lat: number,
  lng: number,
  supernode: string
): number {
  const supernodes: Record<string, Feature<Point>> = {
    'Tucson House': turf.point([-110.97911841503442, 32.24040791166328]),
    'BICAS': turf.point([-110.97072672091602, 32.24640552014024]),
  };

  return turf.distance(turf.point([lng, lat]), supernodes[supernode]);
}

/**
 * Create a new, empty team score object.
 *
 * @param {string} teamName Team name.
 * @return {object} Team scores object.
 */
function createScore(teamName: string): TeamScore {
  // Use an object for the score to allow flexibility for more complex scoring models.
  return {
    teamName,
    total: 0,
    nMeasurements: 0,
    blockGroups: new Set(),
    maxSupernodeDistance: 0,
    maxSignalStrength: -1000,
    minSignalStrength: 0,
  };
}

/**
 * Splits a list of categories into an array.
 *
 * @param {String} categoryStr Comma-separated list of categories.
 * @return {Array<String>} Array of categories or empty array if input is empty.
 */
function parseCategories(categoryStr: string): string[] {
  if (
    typeof categoryStr === 'undefined' ||
    categoryStr === null ||
    categoryStr.trim() === ''
  ) {
    return [];
  }

  return categoryStr.split(',').map(s => s.trim());
}

/**
 * Parse a raw measurement spreadsheet row into an object
 */
function parseMeasurement(measurementRaw: MeasurementRow): Measurement {
  return {
    // ID is index 0
    teamName: measurementRaw[1],
    supernode: measurementRaw[2],
    signalStrength: measurementRaw[3],
    // Location is index 4
    // Vibes is index 5
    // LiteBeam admin screenshot is index 6
    // Line of sight photo is index 7
    blockGroup: measurementRaw[8],
    supernodeDistance: measurementRaw[9],
    subjectiveBonuses: parseCategories(measurementRaw[10]),
  };
}

/**
 * Get initial team scores.
 */
export function getInitialTeamScores(
  measurements: MeasurementRow[]
): TeamScore[] {
  const scoreMap = measurements.reduce((scores, measurementRaw) => {
    const measurement = parseMeasurement(measurementRaw);

    // Skip rows without team names
    if (!measurement.teamName) {
      return scores;
    }

    // Get the team's score
    const score = scores.has(measurement.teamName)
      ? scores.get(measurement.teamName)
      : createScore(measurement.teamName);

    score.nMeasurements++;

    // Add the score for the basic measurement
    score.total += POINTS_BY_TYPE.MEASUREMENT;

    if (measurement.signalStrength > GOOD_SIGNAL_THRESHOLD) {
      score.total += POINTS_BY_TYPE.GOOD_SIGNAL;
    }

    if (measurement.signalStrength > score.maxSignalStrength) {
      score.maxSignalStrength = measurement.signalStrength;
    }

    if (measurement.signalStrength < score.minSignalStrength) {
      score.minSignalStrength = measurement.signalStrength;
    }

    measurement.subjectiveBonuses.forEach(bonus => {
      const subjectiveBonus = POINTS_BY_TYPE[bonus];
      if (subjectiveBonus) {
        score.total += subjectiveBonus;
      }
    });

    // Record the block group
    score.blockGroups.add(measurement.blockGroup);

    if (measurement.supernodeDistance > score.maxSupernodeDistance) {
      score.maxSupernodeDistance = measurement.supernodeDistance;
    }

    // Store the updated team score
    scores.set(measurement.teamName, score);

    return scores;
  }, new Map());

  return Array.from(scoreMap.values());
}

export function getMaximums(scores: TeamScore[]): Maximums {
  return scores.reduce(
    (maximums: Maximums, teamScore: TeamScore) => {
      const newMaximums = { ...maximums };

      newMaximums.nMeasurements =
        teamScore.nMeasurements > newMaximums.nMeasurements
          ? teamScore.nMeasurements
          : newMaximums.nMeasurements;
      newMaximums.nBlockGroups =
        teamScore.blockGroups.size > newMaximums.nBlockGroups
          ? teamScore.blockGroups.size
          : newMaximums.nBlockGroups;
      newMaximums.maxSupernodeDistance =
        teamScore.maxSupernodeDistance > newMaximums.maxSupernodeDistance
          ? teamScore.maxSupernodeDistance
          : newMaximums.maxSupernodeDistance;
      newMaximums.maxSignalStrength =
        teamScore.maxSignalStrength > newMaximums.maxSignalStrength
          ? teamScore.maxSignalStrength
          : newMaximums.maxSignalStrength;
      newMaximums.minSignalStrength =
        teamScore.minSignalStrength < newMaximums.minSignalStrength
          ? teamScore.minSignalStrength
          : newMaximums.minSignalStrength;

      return newMaximums;
    },
    {
      nBlockGroups: 0,
      nMeasurements: 0,
      maxSupernodeDistance: 0,
      maxSignalStrength: -1000,
      minSignalStrength: 0,
    }
  );
}

export function assignAggBonuses(scores: TeamScore[]): TeamScore[] {
  const finalScores = [];
  const maxValues = getMaximums(scores);

  // Assign the aggregate bonuses
  for (const teamScore of scores) {
    if (teamScore.blockGroups.size === maxValues.nBlockGroups) {
      teamScore.total += POINTS_BY_TYPE.MOST_BLOCK_GROUPS;
    }

    if (teamScore.blockGroups.size >= 4) {
      teamScore.total += POINTS_BY_TYPE.MANY_AREAS;
    }

    if (teamScore.nMeasurements === maxValues.nMeasurements) {
      teamScore.total += POINTS_BY_TYPE.MOST_MEASUREMENTS;
    }

    if (teamScore.maxSupernodeDistance === maxValues.maxSupernodeDistance) {
      teamScore.total += POINTS_BY_TYPE.MAX_SUPERNODE_DISTANCE;
    }

    if (teamScore.maxSignalStrength === maxValues.maxSignalStrength) {
      teamScore.total += POINTS_BY_TYPE.MAX_SIGNAL_STRENGTH;
    }

    finalScores.push(teamScore);
  }

  return finalScores;
}

/**
 * Calculates the score for each team in a list of measurements.
 *
 * @param {Array<Array<object>>} measurements Range of measurements.
 * @return {Array<Array<object>>} Scores for each team.
 * @customfunction
 */
export function WARSCORE(measurements: MeasurementRow[]): [string, number][] {
  const scores = assignAggBonuses(getInitialTeamScores(measurements));

  // @todo: Handle additional aggregate bonuses:
  // Furthest distance between any two measurements - This one's probably too computationally difficult
  // Furthest distance from another team's measurement - This one also might be too much to compute

  // Sort scores in descending order and convert to a 2D array
  return scores
    .sort((a, b) => b.total - a.total)
    .map(score => [score.teamName, score.total]);
}
