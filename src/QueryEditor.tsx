/* eslint-disable */

import { ChangeEvent, PureComponent } from 'react';
import {
  LegacyForms,
  InlineFormLabel,
  InlineField,
  InlineFieldRow,
  Input,
  Checkbox
} from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './datasource';
import { MyDataSourceOptions, MyQuery } from './types';

const { Select } = LegacyForms;

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

type State = {
  custom: boolean;
  metrics: Array<SelectableValue<string>>;
  resources: Array<SelectableValue<string>>;
};

export class QueryEditor extends PureComponent<Props> {
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = { custom: props.query.custom, metrics: [], resources: [] };
  }

  onCustomCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ custom: event.target.checked });
    const { onChange, query } = this.props;
    onChange({ ...query, custom: event.target.checked });
  };

  onCustomQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, customQueryText: event.target.value });
  };

  componentDidMount() {
    this.props.datasource.getSymbols('metrics').then((symbols) => {
      let metric_symbols = symbols.map((symbol: any) => ({
        label: symbol.name,
        value: symbol.name,
        description: symbol.attributes.description
      }));
      this.setState({ metrics: metric_symbols });
    });
    this.props.datasource.getSymbols('resources').then((symbols) => {
      let resource_symbols = symbols.map((symbol: any) => ({
        label: symbol.name,
        value: symbol.name,
        description: symbol.attributes.description
      }));
      this.setState({ resources: resource_symbols });
    });
  }

  render() {
    return (
      <div className="gf-form">
        {this.state.custom ? (
          <InlineFieldRow>
            <InlineField label="OpLang Statement" grow>
              <Input
                type="text"
                value={this.props.query.customQueryText || ''}
                onChange={this.onCustomQueryTextChange}
                placeholder={'Custom OpLang Statement'}
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
              placeholder={'Select a resource query'}
              options={this.state.resources}
              onChange={(value) => {
                const { onChange, query } = this.props;
                onChange({ ...query, resourceQueryText: value ? value.value! : '' });
              }}
              menuPlacement={'bottom'}
              width={25}
              defaultValue={
                this.props.query.resourceQueryText && { label: this.props.query.resourceQueryText }
              }
            />
            <InlineFormLabel width={10}>Metric Query</InlineFormLabel>
            <Select
              isClearable
              menuShouldPortal
              allowCustomValue
              placeholder={'Select a metric query'}
              options={this.state.metrics}
              onChange={(value) => {
                const { onChange, query } = this.props;
                onChange({ ...query, metricQueryText: value ? value.value! : '' });
              }}
              menuPlacement={'bottom'}
              width={25}
              defaultValue={
                this.props.query.metricQueryText && { label: this.props.query.metricQueryText }
              }
            />
          </div>
        )}
        <Checkbox
          label={'Custom'}
          value={this.state.custom}
          onChange={this.onCustomCheckboxChange}
        />
      </div>
    );
  }
}
