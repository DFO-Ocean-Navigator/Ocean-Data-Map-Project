import React from "react";
import PropTypes from "prop-types";
import FontAwesome from "react-fontawesome";
import { Button, Modal } from "react-bootstrap";

import Accordion from "./lib/Accordion";
import Icon from "./lib/Icon";

import { withTranslation } from "react-i18next";

const utilizeFocus = () => {
  const ref = React.createRef();
  const setFocus = () => {
    ref.current && ref.current.focus();
  };
  return { setFocus, ref };
};

export class DatasetDropdown extends React.Component {
  constructor(props) {
    super(props);

    this.inputFocus = utilizeFocus();

    this.state = {
      isListOpen: false,
      showHelp: false,
      options: [],
    };

    this.selectHandler = this.selectHandler.bind(this);
    this.toggleList = this.toggleList.bind(this);
    this.toggleShowHelp = this.toggleShowHelp.bind(this);
  }

  componentDidMount() {
    let dropdownItems = [];
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
        options.push([
          <label key={`label_${submenu}`} className="dd-option-label">
            {submenu}
          </label>,
          ...subDatasets.map((sd) => (
            <button
              className="dd-option-button"
              id={sd.id}
              key={sd.id}
              onClick={() => this.selectHandler(sd.id)}
            >
              {sd.value}
            </button>
          ))
        ]);
      }
      dropdownItems.push(
        <Accordion
          id={`accordion_${menu}`}
          key={`accordion_${menu}`}
          title={menu}
          content={options}
        />
      );
    }
    this.setState({ options: dropdownItems });
  }

  toggleList() {
    this.setState((prevState) => ({
      isListOpen: !prevState.isListOpen,
    }));
  }

  toggleShowHelp() {
    this.setState(prevState => ({
      showHelp: !prevState.showHelp,
    }));
  }   

  selectHandler(dataset) {
    this.props.onChange("dataset", dataset);
    this.toggleList();
  }

  render() {
    const title = this.props.datasets.filter((d) => {
      return d.id === this.props.selected;
    })[0].value;

    return (
      <>
        <label>Dataset</label>
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

        <Modal
          show={this.state.showHelp}
          onHide={this.toggleShowHelp}
          bsSize="large"
          dialogClassName="helpdialog"
          backdrop={true}
        >
          <Modal.Header closeButton closeLabel={_("Close")}>
            <Modal.Title>{_("Help")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {this.props.helpContent}
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.toggleShowHelp}>
              <Icon icon="close"/> {_("Close")}
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

//***********************************************************************
DatasetDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  datasets: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.string.isRequired,
  helpContent: PropTypes.arrayOf(PropTypes.object),
};

export default withTranslation()(DatasetDropdown);