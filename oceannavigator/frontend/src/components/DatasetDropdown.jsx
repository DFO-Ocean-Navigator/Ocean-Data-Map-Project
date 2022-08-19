/* eslint-disable react/destructuring-assignment */
import React from "react";
import FontAwesome from "react-fontawesome";
import { Button, ControlLabel, MenuItem } from "react-bootstrap";
import Accordion from "./lib/Accordion";

const utilizeFocus = () => {
  const ref = React.createRef();
  const setFocus = () => {
    ref.current && ref.current.focus();
  };
  return { setFocus, ref };
};

class DatasetDropdown extends React.Component {
  constructor(props) {
    super(props);

    this.inputFocus = utilizeFocus();

    this.state = {
      isListOpen: false,
      options: [],
    };

    this.createMenus = this.createMenus.bind(this);
    this.selectHandler = this.selectHandler.bind(this);
    this.toggleList = this.toggleList.bind(this);
  }

  componentDidMount() {
    this.createMenus();
  }

  createMenus() {
    let content = [];
    let menus = this.props.datasets.map((d) => d.group);
    menus = [...new Set(menus)];

    for (let menu of menus) {
      let datasets = this.props.datasets.filter((d) => {
        return d.group === menu;
      });
      let submenus = datasets.map((d) => d.subgroup);
      submenus = [...new Set(submenus)];

      let options = [];
      for (let submenu of submenus) {
        let subDatasets = datasets.filter((d) => {
          return d.subgroup === submenu;
        });
        options.push(<MenuItem header>{submenu}</MenuItem>);
        options.push(
          ...subDatasets.map((sd) => (
            <MenuItem id={sd.id} key={sd.id} eventKey={sd.id} onSelect={this.selectHandler}>
              {sd.value}
            </MenuItem>
          ))
        );
      }
      content.push(
        <Accordion id={`accordion_${menu}`} key={`accordion_${menu}`} title={menu} content={options} />
      );
    }
    this.setState({ options: content });
  }

  toggleList() {
    this.setState((prevState) => ({
      isListOpen: !prevState.isListOpen,
    }));
    this.inputFocus.setFocus;
  }

  selectHandler(dataset) {
    this.props.onChange("dataset", dataset);
    this.toggleList()
  }

  render() {
    const title = this.props.datasets.filter((d) => {
      return d.id === this.props.selected;
    })[0].value;

    return (
      <>
        <ControlLabel>Dataset</ControlLabel>
        <Button
          onClick={this.toggleShowHelp}
          bsStyle="default"
          bsSize="xsmall"
          style={{
            display: this.props.helpContent ? "block" : "none",
            float: "right",
          }}
        >
          ?
        </Button>
        <div className="dd-wrapper">
          <button type="button" className="dd-header" onClick={this.toggleList}>
            <div className="dd-header-title">{title}</div>
            <FontAwesome
              className="dd-header-icon"
              name="fa-solid fa-angle-down"
            />
          </button>
          {this.state.isListOpen && (
            <div role="list" className="dd-list">
              {this.state.options}
            </div>
          )}
        </div>
      </>
    );
  }
}

export default DatasetDropdown;
