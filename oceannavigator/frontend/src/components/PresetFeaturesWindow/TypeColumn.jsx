import React, { useEffect, useState } from "react";

import Accordion from "react-bootstrap/Accordion";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

function TypeColumn(props) {
  const [features, setFeatures] = useState(props.features);
  useEffect(() => {
    setFeatures(props.features);
  }, [props.features]);

  let featureGroups = Object.keys(features);

  const featureChecked = (e) => {};

  const getFeatureChecks = (name) => {
    let allCheck = (
      <Form.Check
        id={`${name}-all-check`}
        key={`${name}-all-check`}
        onChange={(e, name) => featureChecked(e, name)}
      >
        All
      </Form.Check>
    );
    let feat = features[name].features;
    feat = feat.map((feat) => 
      <Form.Check
        id={`${name}-${feat}-check`}
        key={`${name}-${feat}-check`}
        onChange={(e, name) => featureChecked(e, name)}
      >
        {feat}
      </Form.Check>
    );

    return [allCheck, ...feat];
  };

  let menus = [];
  for (let group of featureGroups) {
    let featureChecks = getFeatureChecks(group);

    let menu = (
      <Accordion>
        <Accordion.Header>{group}</Accordion.Header>
        <Accordion.Body>{featureChecks}</Accordion.Body>
      </Accordion>
    );
    menus.push(menu);
  }

  return <div>{menus}</div>;
}

export default TypeColumn;
