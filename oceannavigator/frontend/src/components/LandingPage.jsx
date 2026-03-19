import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faArrowUpRightFromSquare,
  faAnglesDown,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import introBg from "../../static/img/intro-bg.jpg";
import githubIcon from "../../static/github-mark-white.svg";

function LandingPage({ onEnter }) {
  const [navShrunk, setNavShrunk] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavShrunk(window.scrollY > 100);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (e, targetId) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - 48,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="LandingPage">
      {/* Navigation */}
      <nav
        className={`navbar navbar-expand-lg fixed-top${navShrunk ? " navbar-shrink" : ""}`}
        id="mainNav"
      >
        <div className="container">
          <a
            className="navbar-brand"
            href="#page-top"
            onClick={(e) => scrollTo(e, "page-top")}
          >
            Ocean Navigator <sup>Beta</sup>
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarResponsive"
            aria-controls="navbarResponsive"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            Menu <FontAwesomeIcon icon={faBars} />
          </button>
          <div className="collapse navbar-collapse" id="navbarResponsive">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a
                  className="nav-link js-scroll-trigger"
                  href="#about"
                  onClick={(e) => scrollTo(e, "about")}
                >
                  About
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link"
                  href="https://lite.oceannavigator.ca/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ocean Navigator Lite
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link"
                  href="https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/"
                  target="_blank"
                  rel="noreferrer"
                >
                  User Guide{" "}
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link js-scroll-trigger"
                  href="#contact"
                  onClick={(e) => scrollTo(e, "contact")}
                >
                  Contact
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link"
                  href={`https://github.com/DFO-Ocean-Navigator/Ocean-Data-Map-Project/releases/tag/${__APP_VERSION__}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {__APP_VERSION__}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Intro Header */}
      <header
        id="page-top"
        className="masthead"
        style={{ backgroundImage: `url(${introBg})` }}
      >
        <div className="intro-body">
          <div className="container">
            <div className="row">
              <div className="col-lg-8 mx-auto">
                <h1 className="brand-heading">Ocean Navigator</h1>
                <button className="btn btn-default btn-lg" onClick={onEnter}>
                  Open Now{" "}
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </button>
                <p></p>
                <a
                  href="#about"
                  className="btn btn-circle js-scroll-trigger"
                  onClick={(e) => scrollTo(e, "about")}
                >
                  <FontAwesomeIcon icon={faAnglesDown} className="animated" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* About Section */}
      <section id="about" className="content-section text-center">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mx-auto">
              <h2>What is the Ocean Navigator</h2>
              <p>
                Ocean Navigator is a visualization application for digital ocean
                information that was developed to make numerical ocean
                environment prediction estimates and in-situ ocean observation
                available to end users. It includes a number of different
                variables such as temperature and ocean currents. The tool is
                designed for any user; be it a researcher writing a technical
                paper, or a hobbyist interested in the oceans.
              </p>
              <p>
                For help in using the Ocean Navigator please see the{" "}
                <a
                  href="https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/"
                  target="_blank"
                  rel="noreferrer"
                >
                  User Guide
                </a>
                .
              </p>

              <h2>Objective of Portal</h2>
              <p>
                This portal is designed to enable the discovery and
                accessibility of ocean data from ocean prediction systems and
                ocean observations. Operational prediction systems from Canada
                and other global systems are available via this tool. Several
                other sources of data are available, including, CLASS4
                validation data sources and limited observational data.
              </p>

              <h2>Recommended Use of Data</h2>
              <p>
                These datasets are not intended for navigational purposes. It is
                expected that users of this portal will have an interest in
                oceanographic data and the intention is to provide oceanographic
                context for a wide range of users.
              </p>

              <h2>Data Producer Responsibility</h2>
              <p>
                The developers are not responsible for the use made of the data
                made accessible via this portal, or errors or omissions that
                potentially may occur in the data sets. While we aim to make
                accessible the most recent and up to date data, occasionally a
                delay in the data feed to the portal may be experienced. It is
                the responsibility of the user to ensure the data is used
                appropriately.
                <br />
                <br />
                It is recommended you familiarize yourself with the
                documentation provided by the data provider. If there are any
                questions please contact us.
              </p>

              <h2>Identification of Data Sources</h2>
              <p>
                Use of the downloaded data should identify the original source
                of the data per data provider citation guidelines. Plots
                downloaded from the portal will have a reference to the
                original data source.
                <br />
                <br />
                Suggested citation for products (i.e. plots, spreadsheets)
                generated by this application:
                <br />
                <span className="example-span">
                  (dataset name), https://oceannavigator.ca, (year)
                </span>
                <br />
                Example:
                <br />
                <span className="example-span">
                  GIOPS daily averages, https://oceannavigator.ca, 2023
                </span>
                <br />
                If you would like further information about how to reference the
                data sources that the Ocean Navigator uses please contact us.
              </p>

              <h2 id="contact">Contact Us</h2>
              <p>
                Feel free to contact us with any questions, or potential issues
                with the Navigator!
              </p>
              <ul className="list-inline banner-social-buttons">
                <li className="list-inline-item">
                  <a
                    href="mailto:DFO.OceanNavigator-NavigateurOcean.MPO@dfo-mpo.gc.ca"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-default btn-lg"
                  >
                    <FontAwesomeIcon icon={faEnvelope} />{" "}
                    <span className="network-name">E-mail</span>
                  </a>
                </li>
                <li className="list-inline-item">
                  <a
                    href="https://github.com/DFO-Ocean-Navigator/Ocean-Data-Map-Project/issues/"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-default btn-lg"
                  >
                    <img width="20" height="20" src={githubIcon} />{" "}
                    <span className="network-name">Issues</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container text-center"></div>
      </footer>
    </div>
  );
}

LandingPage.propTypes = {
  onEnter: PropTypes.func.isRequired,
};

export default LandingPage;
