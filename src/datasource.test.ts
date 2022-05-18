import { dateTime, DataQueryRequest } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { DataSource } from './datasource';
import { MyQuery, MyVariableQuery } from './types';

jest.mock('@grafana/runtime', () => ({
  ...(jest.requireActual('@grafana/runtime') as any),
  getBackendSrv: jest.fn(() => {
    return {
      datasourceRequest: () => {},
    };
  }),
  getTemplateSrv: () => ({
    replace: (val: string): string => {
      return val;
    },
  }),
}));

describe('Shoreline datasource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when performing testDatasource call', () => {
    it('should return success on expected response', async () => {
      (getBackendSrv as jest.Mock).mockImplementation(() => {
        return {
          datasourceRequest: () => {
            return Promise.resolve({ data: { resources: [] } });
          },
        };
      });

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.testDatasource();
      expect(result.status).toEqual('success');
      expect(result.message).toEqual('Success');
    });

    it('should return error is response is missing expected data', async () => {
      (getBackendSrv as jest.Mock).mockImplementation(() => {
        return {
          datasourceRequest: () => {
            return Promise.resolve({ data: {} });
          },
        };
      });

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.testDatasource();
      expect(result.status).toEqual('error');
      expect(result.message).toEqual('Health check test query failed, response data: {}');
    });
  });

  describe('when performing query call', () => {
    it('should return expected frames on empty query', async () => {
      (getBackendSrv as jest.Mock).mockImplementation(() => {
        return {
          datasourceRequest: () => {
            return Promise.resolve({ data: { metric_query: [] } });
          },
        };
      });

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.query({
        targets: [],
      } as any as DataQueryRequest<MyQuery>);
      expect(result.data).toEqual([]);
    });

    it('should return expected frames on simple query', async () => {
      let mockDatasourceRequest = jest.fn(() => {
        return Promise.resolve({
          data: {
            metric_query: [
              {
                group_infos: [
                  {
                    group: 'METRIC',
                    name: '',
                    value: 'cpu_usage',
                  },
                  {
                    group: 'RESOURCE',
                    name: '',
                    value: '1',
                  },
                ],
                metric: {
                  values: [3],
                  timestamps: [1000],
                  tags: {},
                  sampling_resolution: 0,
                  resource_name: '1',
                  origin: '',
                  name: 'cpu_usage',
                  metadata_id: 0,
                  labels: {},
                },
              },
            ],
            resources: [
              {
                type: 'HOST',
                tags: [
                  {
                    value: 'linux',
                    key: 'kubernetes.io/os',
                  },
                ],
                parent: '',
                name: 'i-07495dacd87d73a63',
                id: 1,
                attributes: [
                  {
                    value: '5051',
                    key: 'port',
                  },
                ],
              },
            ],
          },
        });
      });
      (getBackendSrv as jest.Mock).mockImplementation(() => {
        return {
          datasourceRequest: mockDatasourceRequest,
        };
      });

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.query({
        targets: [{ refId: 'A', resourceQueryText: 'host', metricQueryText: 'cpu_usage' }],
        range: { from: dateTime(1000), to: dateTime(2000) },
      } as any as DataQueryRequest<MyQuery>);
      expect(result.data.length).toEqual(1);
      expect(result.data[0].name).toEqual('cpu_usage: i-07495dacd87d73a63');

      let timestamps = result.data[0].fields[0];
      expect(timestamps.name).toEqual('Time');
      expect(timestamps.type).toEqual('time');
      expect(timestamps.values.length).toEqual(1);
      expect(timestamps.values.buffer[0]).toEqual(1000);

      let values = result.data[0].fields[1];
      expect(values.name).toEqual('Value');
      expect(values.type).toEqual('number');
      expect(values.values.length).toEqual(1);
      expect(values.values.buffer[0]).toEqual(3);

      expect((mockDatasourceRequest.mock.calls[0] as any)[0].data.statement).toEqual(
        'host | cpu_usage | from=1000 | to=2000'
      );
    });
  });

  describe('when performing metricFindQuery call', () => {
    it('should return resource names on resource query', async () => {
      let mockDatasourceRequest = jest.fn(() => {
        return Promise.resolve({
          data: {
            resources: [
              {
                type: 'HOST',
                tags: [
                  {
                    value: 'linux',
                    key: 'kubernetes.io/os',
                  },
                ],
                parent: '',
                name: 'i-07495dacd87d73a63',
                id: 1,
                attributes: [
                  {
                    value: '5051',
                    key: 'port',
                  },
                ],
              },
            ],
          },
        });
      });
      (getBackendSrv as jest.Mock).mockImplementation(() => {
        return {
          datasourceRequest: mockDatasourceRequest,
        };
      });

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.metricFindQuery({
        query: 'host',
      } as any as MyVariableQuery);
      expect(result[0].text).toEqual('i-07495dacd87d73a63');

      expect((mockDatasourceRequest.mock.calls[0] as any)[0].data.statement).toEqual('host');
    });

    it('should return symbol names on list symbol', async () => {
      let mockDatasourceRequest = jest.fn(() => {
        return Promise.resolve({
          data: {
            list_type: {
              symbol: [
                {
                  attributes: {
                    description: 'All pods',
                    name: 'pods',
                    params: '',
                    read_only: 'true',
                    res_env_var: '',
                    resource_query: '',
                    resource_type: '',
                    shell: '',
                    timeout: '',
                    type: 'RESOURCE',
                    units: '',
                    user: '',
                    value: 'resources(type="POD")',
                  },
                  formula: 'resources(type="POD")',
                  name: 'pods',
                  type: 'RESOURCE',
                },
                {
                  attributes: {
                    description: 'All containers',
                    name: 'containers',
                    params: '',
                    read_only: 'true',
                    res_env_var: '',
                    resource_query: '',
                    resource_type: '',
                    shell: '',
                    timeout: '',
                    type: 'RESOURCE',
                    units: '',
                    user: '',
                    value: 'resources(type="CONTAINER")',
                  },
                  formula: 'resources(type="CONTAINER")',
                  name: 'containers',
                  type: 'RESOURCE',
                },
              ],
            },
          },
        });
      });
      (getBackendSrv as jest.Mock).mockImplementation(() => {
        return {
          datasourceRequest: mockDatasourceRequest,
        };
      });

      const ds = new DataSource({ name: '', id: 0, jsonData: {} } as any);
      const result = await ds.metricFindQuery({
        query: 'list resources',
      } as any as MyVariableQuery);
      expect(result.length).toEqual(2);
      expect(result[0].text).toEqual('pods');
      expect(result[1].text).toEqual('containers');

      expect((mockDatasourceRequest.mock.calls[0] as any)[0].data.statement).toEqual('list resources');
    });
  });
});
