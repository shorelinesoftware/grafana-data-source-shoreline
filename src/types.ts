import { DataQuery, DataSourceJsonData } from '@grafana/data';

export type MyQuery = DataQuery & {
  resourceQueryText: string;
  metricQueryText: string;
  custom: boolean;
  customQueryText?: string;
  queryText?: string;
};

export type MyVariableQuery = {
  query: string;
};

export const defaultQuery: Partial<MyQuery> = {};

/**
 * These are options configured for each DataSource instance
 */
export type MyDataSourceOptions = DataSourceJsonData & {
  shorelineUrl: string;
};

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export type MySecureJsonData = {
  apiKey: string;
};
