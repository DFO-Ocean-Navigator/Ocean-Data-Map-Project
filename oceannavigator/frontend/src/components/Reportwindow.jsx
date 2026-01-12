import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Form,
  Alert,
  Card,
  Row,
  Col,
  Spinner,
  ButtonGroup,
  ToggleButton,
  Badge,
} from "react-bootstrap";
import { withTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faPaperPlane,
  faBug,
  faLightbulb,
  faQuestion,
  faImage,
  faTimes,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";

function FeedbackWindow(props) {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    feedbackType: "bug",
    email: "",
    description: "",
  });
  const [permalink, setPermalink] = useState("");

  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [screenshots, setScreenshots] = useState([]);
  const fileInputRef = useRef(null);

  const __ = props.t;

  // Feedback type options
  const feedbackTypes = [
    { value: "bug", label: __("Bug Report"), icon: faBug, variant: "danger" },
    {
      value: "feature",
      label: __("Feature Request"),
      icon: faLightbulb,
      variant: "primary",
    },
    {
      value: "other",
      label: __("Other"),
      icon: faQuestion,
      variant: "secondary",
    },
  ];

  //useEFfect to generate permalink on click
  useEffect(() => {
    const permalinkSettings = {
      dataset0: true,
      dataset1: props.compareDatasets,
      mapSettings: true,
      featureType: true,
      vectorid: true,
      time: true,
    };

    const generatedLink = props.generatePermLink(permalinkSettings);
    setPermalink(generatedLink);
  }, [props.generatePermLink, props.compareDatasets]);

  //handles innput
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error message for the field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // handle feedback type change
  const handleFeedbackTypeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      feedbackType: value,
    }));
  };

  //handles copy button for permalink
  const handleCopyPermalink = () => {
    navigator.clipboard.writeText(permalink);
    setCopied(true);
  };

  //checks if mandatory fields are filled correctly
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = __("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = __("Please enter a valid email address");
    }

    if (!formData.description.trim()) {
      newErrors.description = __("Description is required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const Google_form_Url =
    "https://docs.google.com/forms/u/0/d/e/1FAIpQLScWMaa6sUo2_fEFucDFGa1tXfwT2GgJ5Q7XV6TfM5GuVn8ruw/formResponse";
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    const formDataToSend = new FormData();

    formDataToSend.append("entry.921734993", formData.name);
    formDataToSend.append("entry.1530791040", formData.email);
    formDataToSend.append("entry.662130548", formData.subject);
    formDataToSend.append("entry.1364439903", formData.description);
    formDataToSend.append("entry.630392635", permalink);

    await fetch(Google_form_Url, {
      method: "POST",
      mode: "no-cors",
      body: formDataToSend,
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="FeedbackWindow">
      {submitted ? (
        <Alert variant="success" className="text-center">
          <h5>{__("Thank you for your feedback!")}</h5>
          <p>{__("We've received your submission and will review it soon.")}</p>
        </Alert>
      ) : (
        <Form onSubmit={handleSubmit} noValidate>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  {__("Name")}{" "}
                  <small className="text-muted">({__("Optional")})</small>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={__("Your name")}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  {__("Contact Email")} <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={__("your.email@example.com")}
                  isInvalid={!!errors.email}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>{__("Feedback Type")}</Form.Label>
            <div>
              <ButtonGroup className="w-100">
                {feedbackTypes.map((type) => (
                  <ToggleButton
                    key={type.value}
                    id={`feedback-type-${type.value}`}
                    type="radio"
                    variant={`outline-${type.variant}`}
                    name="feedbackType"
                    value={type.value}
                    checked={formData.feedbackType === type.value}
                    onChange={(e) =>
                      handleFeedbackTypeChange(e.currentTarget.value)
                    }
                  >
                    <FontAwesomeIcon icon={type.icon} className="me-2" />
                    {type.label}
                  </ToggleButton>
                ))}
              </ButtonGroup>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              {__("Subject/Title")}{" "}
              <small className="text-muted">({__("Optional")})</small>
            </Form.Label>
            <Form.Control
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder={
                formData.feedbackType === "bug"
                  ? __("Brief description of the issue")
                  : formData.feedbackType === "feature"
                  ? __("Brief description of your suggestion")
                  : __("Brief subject of your feedback")
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              {__("Description")} <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={6}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={
                formData.feedbackType === "bug"
                  ? __(
                      "Please describe:\n" +
                        "• What you were trying to do\n" +
                        "• What actually happened\n" +
                        "• Any error messages you saw\n" +
                        "• Steps to reproduce the issue"
                    )
                  : formData.feedbackType === "feature"
                  ? __(
                      "Please describe:\n" +
                        "• What feature would you like to see\n" +
                        "• How it would help your workflow\n" +
                        "• Any specific requirements or details"
                    )
                  : __("Please provide your feedback or comments")
              }
              isInvalid={!!errors.description}
              required
            />
            <Form.Control.Feedback type="invalid">
              {errors.description}
            </Form.Control.Feedback>
          </Form.Group>

          <Card className="mb-3">
            <Card.Header>
              <strong>{__("Current State Snapshot")}</strong>
            </Card.Header>
            <Card.Body>
              <p className="text-muted small mb-2">
                {__(
                  "The following link captures the current state of your map and will be included with your feedback:"
                )}
              </p>
              <Row>
                <Col>
                  <Form.Control
                    type="text"
                    readOnly
                    value={permalink}
                    className="font-monospace small"
                    onClick={(e) => e.target.select()}
                  />
                </Col>
                <Col xs="auto">
                  <Button
                    variant={copied ? "success" : "secondary"}
                    onClick={handleCopyPermalink}
                    disabled={!permalink}
                  >
                    <FontAwesomeIcon icon={faCopy} />
                    {copied ? " " + __("Copied!") : " " + __("Copy")}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Alert variant="info" className="small">
            <strong>{__("Privacy Note:")}</strong>{" "}
            {__(
              "Your feedback and contact information will be used solely to improve Ocean Navigator. " +
                "We will only contact you if we need clarification about your submission."
            )}
          </Alert>

          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                props.updateUI({ showModal: false, modalType: "" })
              }
              disabled={submitting}
            >
              {__("Cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  {__("Submitting...")}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
                  {__("Submit Feedback")}
                </>
              )}
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}

export default withTranslation()(FeedbackWindow);
