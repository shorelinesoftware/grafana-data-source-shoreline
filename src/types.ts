import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  resourceQueryText: string;
  metricQueryText: string;
  custom: boolean;
  customQueryText?: string;
  queryText?: string;
}

export interface MyVariableQuery {
  query: string;
}

export const defaultQuery: Partial<MyQuery> = {
  // constant: 6.5,
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  shorelineUrl: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey: string;
}
