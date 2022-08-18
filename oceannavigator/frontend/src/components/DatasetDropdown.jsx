/* eslint-disable react/destructuring-assignment */
import React from "react";
import FontAwesome from "react-fontawesome";
import { MenuItem } from "react-bootstrap";
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
      title: "",
      isListOpen: false,
      options: [],
    };

    this.toggleList = this.toggleList.bind(this);
    this.selectHandler = this.selectHandler.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.datasets !== prevProps.datasets) {
      console.log("Datasets updated");
      console.log(this.props.datasets);

      let content = [];
      for (let group in this.props.datasets) {
        let subcontent = [];
        for (let subgroup in this.props.datasets[group]) {
          let items = this.props.datasets[group][subgroup].map((dataset) => (
            <MenuItem eventKey={dataset} onSelect={this.selectHandler}>
              {dataset.value}
            </MenuItem>
          ));
          subcontent.push(<MenuItem header>{subgroup}</MenuItem>);
          subcontent.push(...items);
        }

        content.push(
          <Accordion
            id={`accordion_${group}`}
            title={group}
            content={subcontent}
          />
        );
      }

      this.setState({ options: content });
    }
  }

  toggleList() {
    this.setState((prevState) => ({
      isListOpen: !prevState.isListOpen,
    }));
    this.inputFocus.setFocus;
  }

  selectHandler(dataset) {
    this.setState({ title: dataset.value });
    this.toggleList();
  }

  render() {
    return (
      <div className="dd-wrapper">
        <button type="button" className="dd-header" onClick={this.toggleList}>
          <div className="dd-header-title">{this.state.title}</div>
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
    );
  }
}

export default DatasetDropdown;
