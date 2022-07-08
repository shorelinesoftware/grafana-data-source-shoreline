import React, { useState, useEffect } from 'react';
import {
  LegacyForms,
  InlineFormLabel,
  InlineField,
  InlineFieldRow,
  Input,
  Checkbox
} from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { MyDataSourceOptions, MyQuery } from './types';

const { Select } = LegacyForms;

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export const QueryEditor: React.FC<Props> = ({ query, onChange, datasource }) => {
  const [state, setState] = useState(query);
  const [resources, setResources] = useState([]);
  const [metrics, setMetrics] = useState([]);

  const saveQuery = () => {
    onChange(state);
  };

  useEffect(() => {
    function fetchSymbols() {
      datasource.getSymbols('metrics').then((symbols) => {
        const metricSymbols = symbols.map((symbol: any) => ({
          label: symbol.name,
          value: symbol.name,
          description: symbol.attributes.description
        }));
        setMetrics(metricSymbols);
      });
      datasource.getSymbols('resources').then((symbols) => {
        const resourceSymbols = symbols.map((symbol: any) => ({
          label: symbol.name,
          value: symbol.name,
          description: symbol.attributes.description
        }));
        setResources(resourceSymbols);
      });
    }
    fetchSymbols();
  }, [datasource]);

  return (
    <div className="gf-form">
      {state.custom ? (
        <InlineFieldRow>
          <InlineField label="OpLang Statement" grow>
            <Input
              type="text"
              value={state.customQueryText || ''}
              onBlur={saveQuery}
              onChange={(event) =>
                setState({ ...state, customQueryText: (event.target as HTMLTextAreaElement).value })
              }
              placeholder="Custom OpLang Statement"
              width={125}
            />
          </InlineField>
        </InlineFieldRow>
      ) : (
        <div className="gf-form">
          <InlineFormLabel width={10}>Resource Query</InlineFormLabel>
          <Select
            isClearable
            menuShouldPortal
            allowCustomValue
            placeholder="Select a resource query"
            options={resources}
            onBlur={saveQuery}
            onChange={(value) => setState({ ...state, resourceQueryText: value.value! as string })}
            menuPlacement="bottom"
            width={25}
            defaultValue={state.resourceQueryText && { label: state.resourceQueryText }}
          />
          <InlineFormLabel width={10}>Metric Query</InlineFormLabel>
          <Select
            isClearable
            menuShouldPortal
            allowCustomValue
            placeholder="Select a metric query"
            options={metrics}
            onBlur={saveQuery}
            onChange={(value) => setState({ ...state, metricQueryText: value.value! as string })}
            menuPlacement="bottom"
            width={25}
            defaultValue={state.metricQueryText && { label: state.metricQueryText }}
          />
        </div>
      )}
      <Checkbox
        label="Custom"
        value={state.custom}
        onChange={(event) =>
          setState({ ...state, custom: (event.target as HTMLInputElement).checked })
        }
      />
    </div>
  );
};
