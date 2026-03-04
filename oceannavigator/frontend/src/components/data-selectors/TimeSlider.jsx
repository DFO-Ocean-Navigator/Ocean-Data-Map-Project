import React, { useState, useEffect, useRef, useCallback } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import {
  ChevronBarLeft,
  ChevronBarRight,
  ChevronLeft,
  ChevronDoubleLeft,
  ChevronRight,
  ChevronDoubleRight,
} from "react-bootstrap-icons";

import TimeSliderButton from "./TimeSliderButton.jsx";

import { withTranslation } from "react-i18next";

var timestamps = [
  { id: 2398593600, value: "2026-01-03T12:00:00+00:00" },
  { id: 2398597200, value: "2026-01-03T13:00:00+00:00" },
  { id: 2398600800, value: "2026-01-03T14:00:00+00:00" },
  { id: 2398604400, value: "2026-01-03T15:00:00+00:00" },
  { id: 2398608000, value: "2026-01-03T16:00:00+00:00" },
  { id: 2398611600, value: "2026-01-03T17:00:00+00:00" },
  { id: 2398636800, value: "2026-01-04T00:00:00+00:00" },
  { id: 2398640400, value: "2026-01-04T01:00:00+00:00" },
  { id: 2398644000, value: "2026-01-04T02:00:00+00:00" },
  { id: 2398647600, value: "2026-01-04T03:00:00+00:00" },
  { id: 2398651200, value: "2026-01-04T04:00:00+00:00" },
  { id: 2398654800, value: "2026-01-04T05:00:00+00:00" },
  { id: 2398658400, value: "2026-01-04T06:00:00+00:00" },
  { id: 2398662000, value: "2026-01-04T07:00:00+00:00" },
  { id: 2398665600, value: "2026-01-04T08:00:00+00:00" },
  { id: 2398669200, value: "2026-01-04T09:00:00+00:00" },
  { id: 2398672800, value: "2026-01-04T10:00:00+00:00" },
  { id: 2398676400, value: "2026-01-04T11:00:00+00:00" },
  { id: 2398680000, value: "2026-01-04T12:00:00+00:00" },
  { id: 2398683600, value: "2026-01-04T13:00:00+00:00" },
  { id: 2398687200, value: "2026-01-04T14:00:00+00:00" },
  { id: 2398690800, value: "2026-01-04T15:00:00+00:00" },
  { id: 2398694400, value: "2026-01-04T16:00:00+00:00" },
  { id: 2398698000, value: "2026-01-04T17:00:00+00:00" },
  { id: 2398723200, value: "2026-01-05T00:00:00+00:00" },
  { id: 2398726800, value: "2026-01-05T01:00:00+00:00" },
  { id: 2398730400, value: "2026-01-05T02:00:00+00:00" },
  { id: 2398734000, value: "2026-01-05T03:00:00+00:00" },
  { id: 2398737600, value: "2026-01-05T04:00:00+00:00" },
  { id: 2398741200, value: "2026-01-05T05:00:00+00:00" },
  { id: 2398744800, value: "2026-01-05T06:00:00+00:00" },
  { id: 2398748400, value: "2026-01-05T07:00:00+00:00" },
  { id: 2398752000, value: "2026-01-05T08:00:00+00:00" },
  { id: 2398755600, value: "2026-01-05T09:00:00+00:00" },
  { id: 2398759200, value: "2026-01-05T10:00:00+00:00" },
  { id: 2398762800, value: "2026-01-05T11:00:00+00:00" },
  { id: 2398766400, value: "2026-01-05T12:00:00+00:00" },
  { id: 2398770000, value: "2026-01-05T13:00:00+00:00" },
  { id: 2398773600, value: "2026-01-05T14:00:00+00:00" },
  { id: 2398777200, value: "2026-01-05T15:00:00+00:00" },
  { id: 2398780800, value: "2026-01-05T16:00:00+00:00" },
  { id: 2398784400, value: "2026-01-05T17:00:00+00:00" },
  { id: 2398809600, value: "2026-01-06T00:00:00+00:00" },
  { id: 2398813200, value: "2026-01-06T01:00:00+00:00" },
  { id: 2398816800, value: "2026-01-06T02:00:00+00:00" },
  { id: 2398820400, value: "2026-01-06T03:00:00+00:00" },
  { id: 2398824000, value: "2026-01-06T04:00:00+00:00" },
  { id: 2398827600, value: "2026-01-06T05:00:00+00:00" },
  { id: 2398831200, value: "2026-01-06T06:00:00+00:00" },
  { id: 2398834800, value: "2026-01-06T07:00:00+00:00" },
  { id: 2398838400, value: "2026-01-06T08:00:00+00:00" },
  { id: 2398842000, value: "2026-01-06T09:00:00+00:00" },
  { id: 2398845600, value: "2026-01-06T10:00:00+00:00" },
  { id: 2398849200, value: "2026-01-06T11:00:00+00:00" },
  { id: 2398852800, value: "2026-01-06T12:00:00+00:00" },
  { id: 2398856400, value: "2026-01-06T13:00:00+00:00" },
  { id: 2398860000, value: "2026-01-06T14:00:00+00:00" },
  { id: 2398863600, value: "2026-01-06T15:00:00+00:00" },
  { id: 2398867200, value: "2026-01-06T16:00:00+00:00" },
  { id: 2398870800, value: "2026-01-06T17:00:00+00:00" },
  { id: 2398896000, value: "2026-01-07T00:00:00+00:00" },
  { id: 2398899600, value: "2026-01-07T01:00:00+00:00" },
  { id: 2398903200, value: "2026-01-07T02:00:00+00:00" },
  { id: 2398906800, value: "2026-01-07T03:00:00+00:00" },
  { id: 2398910400, value: "2026-01-07T04:00:00+00:00" },
  { id: 2398914000, value: "2026-01-07T05:00:00+00:00" },
  { id: 2398917600, value: "2026-01-07T06:00:00+00:00" },
  { id: 2398921200, value: "2026-01-07T07:00:00+00:00" },
  { id: 2398924800, value: "2026-01-07T08:00:00+00:00" },
  { id: 2398928400, value: "2026-01-07T09:00:00+00:00" },
  { id: 2398932000, value: "2026-01-07T10:00:00+00:00" },
  { id: 2398935600, value: "2026-01-07T11:00:00+00:00" },
  { id: 2398939200, value: "2026-01-07T12:00:00+00:00" },
  { id: 2398942800, value: "2026-01-07T13:00:00+00:00" },
  { id: 2398946400, value: "2026-01-07T14:00:00+00:00" },
  { id: 2398950000, value: "2026-01-07T15:00:00+00:00" },
  { id: 2398953600, value: "2026-01-07T16:00:00+00:00" },
  { id: 2398957200, value: "2026-01-07T17:00:00+00:00" },
  { id: 2398982400, value: "2026-01-08T00:00:00+00:00" },
  { id: 2398986000, value: "2026-01-08T01:00:00+00:00" },
  { id: 2398989600, value: "2026-01-08T02:00:00+00:00" },
  { id: 2398993200, value: "2026-01-08T03:00:00+00:00" },
  { id: 2398996800, value: "2026-01-08T04:00:00+00:00" },
  { id: 2399000400, value: "2026-01-08T05:00:00+00:00" },
  { id: 2399004000, value: "2026-01-08T06:00:00+00:00" },
  { id: 2399007600, value: "2026-01-08T07:00:00+00:00" },
  { id: 2399011200, value: "2026-01-08T08:00:00+00:00" },
  { id: 2399014800, value: "2026-01-08T09:00:00+00:00" },
  { id: 2399018400, value: "2026-01-08T10:00:00+00:00" },
  { id: 2399022000, value: "2026-01-08T11:00:00+00:00" },
  { id: 2399025600, value: "2026-01-08T12:00:00+00:00" },
  { id: 2399029200, value: "2026-01-08T13:00:00+00:00" },
  { id: 2399032800, value: "2026-01-08T14:00:00+00:00" },
  { id: 2399036400, value: "2026-01-08T15:00:00+00:00" },
  { id: 2399040000, value: "2026-01-08T16:00:00+00:00" },
  { id: 2399043600, value: "2026-01-08T17:00:00+00:00" },
  { id: 2399068800, value: "2026-01-09T00:00:00+00:00" },
  { id: 2399072400, value: "2026-01-09T01:00:00+00:00" },
  { id: 2399076000, value: "2026-01-09T02:00:00+00:00" },
  { id: 2399079600, value: "2026-01-09T03:00:00+00:00" },
  { id: 2399083200, value: "2026-01-09T04:00:00+00:00" },
  { id: 2399086800, value: "2026-01-09T05:00:00+00:00" },
  { id: 2399090400, value: "2026-01-09T06:00:00+00:00" },
  { id: 2399094000, value: "2026-01-09T07:00:00+00:00" },
  { id: 2399097600, value: "2026-01-09T08:00:00+00:00" },
  { id: 2399101200, value: "2026-01-09T09:00:00+00:00" },
  { id: 2399104800, value: "2026-01-09T10:00:00+00:00" },
  { id: 2399108400, value: "2026-01-09T11:00:00+00:00" },
  { id: 2399112000, value: "2026-01-09T12:00:00+00:00" },
  { id: 2399115600, value: "2026-01-09T13:00:00+00:00" },
  { id: 2399119200, value: "2026-01-09T14:00:00+00:00" },
  { id: 2399122800, value: "2026-01-09T15:00:00+00:00" },
  { id: 2399126400, value: "2026-01-09T16:00:00+00:00" },
  { id: 2399130000, value: "2026-01-09T17:00:00+00:00" },
  { id: 2399155200, value: "2026-01-10T00:00:00+00:00" },
  { id: 2399158800, value: "2026-01-10T01:00:00+00:00" },
  { id: 2399162400, value: "2026-01-10T02:00:00+00:00" },
  { id: 2399166000, value: "2026-01-10T03:00:00+00:00" },
  { id: 2399169600, value: "2026-01-10T04:00:00+00:00" },
  { id: 2399173200, value: "2026-01-10T05:00:00+00:00" },
  { id: 2399176800, value: "2026-01-10T06:00:00+00:00" },
  { id: 2399180400, value: "2026-01-10T07:00:00+00:00" },
  { id: 2399184000, value: "2026-01-10T08:00:00+00:00" },
  { id: 2399187600, value: "2026-01-10T09:00:00+00:00" },
  { id: 2399191200, value: "2026-01-10T10:00:00+00:00" },
  { id: 2399194800, value: "2026-01-10T11:00:00+00:00" },
  { id: 2399198400, value: "2026-01-10T12:00:00+00:00" },
  { id: 2399202000, value: "2026-01-10T13:00:00+00:00" },
  { id: 2399205600, value: "2026-01-10T14:00:00+00:00" },
  { id: 2399209200, value: "2026-01-10T15:00:00+00:00" },
  { id: 2399212800, value: "2026-01-10T16:00:00+00:00" },
  { id: 2399216400, value: "2026-01-10T17:00:00+00:00" },
  { id: 2399241600, value: "2026-01-11T00:00:00+00:00" },
  { id: 2399245200, value: "2026-01-11T01:00:00+00:00" },
  { id: 2399248800, value: "2026-01-11T02:00:00+00:00" },
  { id: 2399252400, value: "2026-01-11T03:00:00+00:00" },
  { id: 2399256000, value: "2026-01-11T04:00:00+00:00" },
  { id: 2399259600, value: "2026-01-11T05:00:00+00:00" },
  { id: 2399263200, value: "2026-01-11T06:00:00+00:00" },
  { id: 2399266800, value: "2026-01-11T07:00:00+00:00" },
  { id: 2399270400, value: "2026-01-11T08:00:00+00:00" },
  { id: 2399274000, value: "2026-01-11T09:00:00+00:00" },
  { id: 2399277600, value: "2026-01-11T10:00:00+00:00" },
  { id: 2399281200, value: "2026-01-11T11:00:00+00:00" },
  { id: 2399284800, value: "2026-01-11T12:00:00+00:00" },
  { id: 2399288400, value: "2026-01-11T13:00:00+00:00" },
  { id: 2399292000, value: "2026-01-11T14:00:00+00:00" },
  { id: 2399295600, value: "2026-01-11T15:00:00+00:00" },
  { id: 2399299200, value: "2026-01-11T16:00:00+00:00" },
  { id: 2399302800, value: "2026-01-11T17:00:00+00:00" },
  { id: 2399328000, value: "2026-01-12T00:00:00+00:00" },
  { id: 2399331600, value: "2026-01-12T01:00:00+00:00" },
  { id: 2399335200, value: "2026-01-12T02:00:00+00:00" },
  { id: 2399338800, value: "2026-01-12T03:00:00+00:00" },
  { id: 2399342400, value: "2026-01-12T04:00:00+00:00" },
  { id: 2399346000, value: "2026-01-12T05:00:00+00:00" },
  { id: 2399349600, value: "2026-01-12T06:00:00+00:00" },
  { id: 2399353200, value: "2026-01-12T07:00:00+00:00" },
  { id: 2399356800, value: "2026-01-12T08:00:00+00:00" },
  { id: 2399360400, value: "2026-01-12T09:00:00+00:00" },
  { id: 2399364000, value: "2026-01-12T10:00:00+00:00" },
  { id: 2399367600, value: "2026-01-12T11:00:00+00:00" },
  { id: 2399371200, value: "2026-01-12T12:00:00+00:00" },
  { id: 2399374800, value: "2026-01-12T13:00:00+00:00" },
  { id: 2399378400, value: "2026-01-12T14:00:00+00:00" },
  { id: 2399382000, value: "2026-01-12T15:00:00+00:00" },
  { id: 2399385600, value: "2026-01-12T16:00:00+00:00" },
  { id: 2399389200, value: "2026-01-12T17:00:00+00:00" },
  { id: 2399414400, value: "2026-01-13T00:00:00+00:00" },
  { id: 2399418000, value: "2026-01-13T01:00:00+00:00" },
  { id: 2399421600, value: "2026-01-13T02:00:00+00:00" },
  { id: 2399425200, value: "2026-01-13T03:00:00+00:00" },
  { id: 2399428800, value: "2026-01-13T04:00:00+00:00" },
  { id: 2399432400, value: "2026-01-13T05:00:00+00:00" },
  { id: 2399436000, value: "2026-01-13T06:00:00+00:00" },
  { id: 2399439600, value: "2026-01-13T07:00:00+00:00" },
  { id: 2399443200, value: "2026-01-13T08:00:00+00:00" },
  { id: 2399446800, value: "2026-01-13T09:00:00+00:00" },
  { id: 2399450400, value: "2026-01-13T10:00:00+00:00" },
  { id: 2399454000, value: "2026-01-13T11:00:00+00:00" },
  { id: 2399457600, value: "2026-01-13T12:00:00+00:00" },
  { id: 2399461200, value: "2026-01-13T13:00:00+00:00" },
  { id: 2399464800, value: "2026-01-13T14:00:00+00:00" },
  { id: 2399468400, value: "2026-01-13T15:00:00+00:00" },
  { id: 2399472000, value: "2026-01-13T16:00:00+00:00" },
  { id: 2399475600, value: "2026-01-13T17:00:00+00:00" },
  { id: 2403648000, value: "2026-03-03T00:00:00+00:00" },
  { id: 2403651600, value: "2026-03-03T01:00:00+00:00" },
  { id: 2403655200, value: "2026-03-03T02:00:00+00:00" },
  { id: 2403658800, value: "2026-03-03T03:00:00+00:00" },
  { id: 2403662400, value: "2026-03-03T04:00:00+00:00" },
  { id: 2403666000, value: "2026-03-03T05:00:00+00:00" },
  { id: 2403669600, value: "2026-03-03T06:00:00+00:00" },
  { id: 2403673200, value: "2026-03-03T07:00:00+00:00" },
  { id: 2403676800, value: "2026-03-03T08:00:00+00:00" },
  { id: 2403680400, value: "2026-03-03T09:00:00+00:00" },
  { id: 2403684000, value: "2026-03-03T10:00:00+00:00" },
  { id: 2403687600, value: "2026-03-03T11:00:00+00:00" },
  { id: 2403691200, value: "2026-03-03T12:00:00+00:00" },
  { id: 2403694800, value: "2026-03-03T13:00:00+00:00" },
  { id: 2403698400, value: "2026-03-03T14:00:00+00:00" },
  { id: 2403702000, value: "2026-03-03T15:00:00+00:00" },
  { id: 2403705600, value: "2026-03-03T16:00:00+00:00" },
  { id: 2403709200, value: "2026-03-03T17:00:00+00:00" },
  { id: 2403712800, value: "2026-03-03T18:00:00+00:00" },
  { id: 2403716400, value: "2026-03-03T19:00:00+00:00" },
  { id: 2403720000, value: "2026-03-03T20:00:00+00:00" },
  { id: 2403723600, value: "2026-03-03T21:00:00+00:00" },
  { id: 2403727200, value: "2026-03-03T22:00:00+00:00" },
  { id: 2403730800, value: "2026-03-03T23:00:00+00:00" },
  { id: 2403734400, value: "2026-03-04T00:00:00+00:00" },
  { id: 2403738000, value: "2026-03-04T01:00:00+00:00" },
  { id: 2403741600, value: "2026-03-04T02:00:00+00:00" },
  { id: 2403745200, value: "2026-03-04T03:00:00+00:00" },
  { id: 2403748800, value: "2026-03-04T04:00:00+00:00" },
  { id: 2403752400, value: "2026-03-04T05:00:00+00:00" },
  { id: 2403756000, value: "2026-03-04T06:00:00+00:00" },
  { id: 2403759600, value: "2026-03-04T07:00:00+00:00" },
  { id: 2403763200, value: "2026-03-04T08:00:00+00:00" },
  { id: 2403766800, value: "2026-03-04T09:00:00+00:00" },
  { id: 2403770400, value: "2026-03-04T10:00:00+00:00" },
  { id: 2403774000, value: "2026-03-04T11:00:00+00:00" },
  { id: 2403777600, value: "2026-03-04T12:00:00+00:00" },
  { id: 2403781200, value: "2026-03-04T13:00:00+00:00" },
  { id: 2403784800, value: "2026-03-04T14:00:00+00:00" },
  { id: 2403788400, value: "2026-03-04T15:00:00+00:00" },
  { id: 2403792000, value: "2026-03-04T16:00:00+00:00" },
  { id: 2403795600, value: "2026-03-04T17:00:00+00:00" },
  { id: 2403799200, value: "2026-03-04T18:00:00+00:00" },
  { id: 2403802800, value: "2026-03-04T19:00:00+00:00" },
  { id: 2403806400, value: "2026-03-04T20:00:00+00:00" },
  { id: 2403810000, value: "2026-03-04T21:00:00+00:00" },
  { id: 2403813600, value: "2026-03-04T22:00:00+00:00" },
  { id: 2403817200, value: "2026-03-04T23:00:00+00:00" },
  { id: 2403820800, value: "2026-03-05T00:00:00+00:00" },
  { id: 2403824400, value: "2026-03-05T01:00:00+00:00" },
  { id: 2403828000, value: "2026-03-05T02:00:00+00:00" },
  { id: 2403831600, value: "2026-03-05T03:00:00+00:00" },
  { id: 2403835200, value: "2026-03-05T04:00:00+00:00" },
  { id: 2403838800, value: "2026-03-05T05:00:00+00:00" },
  { id: 2403842400, value: "2026-03-05T06:00:00+00:00" },
  { id: 2403846000, value: "2026-03-05T07:00:00+00:00" },
  { id: 2403849600, value: "2026-03-05T08:00:00+00:00" },
  { id: 2403853200, value: "2026-03-05T09:00:00+00:00" },
  { id: 2403856800, value: "2026-03-05T10:00:00+00:00" },
  { id: 2403860400, value: "2026-03-05T11:00:00+00:00" },
  { id: 2403864000, value: "2026-03-05T12:00:00+00:00" },
  { id: 2403867600, value: "2026-03-05T13:00:00+00:00" },
  { id: 2403871200, value: "2026-03-05T14:00:00+00:00" },
  { id: 2403874800, value: "2026-03-05T15:00:00+00:00" },
  { id: 2403878400, value: "2026-03-05T16:00:00+00:00" },
  { id: 2403882000, value: "2026-03-05T17:00:00+00:00" },
  { id: 2403885600, value: "2026-03-05T18:00:00+00:00" },
  { id: 2403889200, value: "2026-03-05T19:00:00+00:00" },
  { id: 2403892800, value: "2026-03-05T20:00:00+00:00" },
  { id: 2403896400, value: "2026-03-05T21:00:00+00:00" },
  { id: 2403900000, value: "2026-03-05T22:00:00+00:00" },
  { id: 2403903600, value: "2026-03-05T23:00:00+00:00" },
  { id: 2403907200, value: "2026-03-06T00:00:00+00:00" },
  { id: 2403910800, value: "2026-03-06T01:00:00+00:00" },
  { id: 2403914400, value: "2026-03-06T02:00:00+00:00" },
  { id: 2403918000, value: "2026-03-06T03:00:00+00:00" },
  { id: 2403921600, value: "2026-03-06T04:00:00+00:00" },
  { id: 2403925200, value: "2026-03-06T05:00:00+00:00" },
  { id: 2403928800, value: "2026-03-06T06:00:00+00:00" },
  { id: 2403932400, value: "2026-03-06T07:00:00+00:00" },
  { id: 2403936000, value: "2026-03-06T08:00:00+00:00" },
  { id: 2403939600, value: "2026-03-06T09:00:00+00:00" },
  { id: 2403943200, value: "2026-03-06T10:00:00+00:00" },
  { id: 2403946800, value: "2026-03-06T11:00:00+00:00" },
  { id: 2403950400, value: "2026-03-06T12:00:00+00:00" },
];

const thumbWidth = 15;
const trackOffset = 50;
const tickWidth = 35;

function TimeSlider(props) {
  const [selected, setSelected] = useState(0);
  const [sliderTicks, setSliderTicks] = useState([]);
  const [thumbLeft, setThumbLeft] = useState(trackOffset + tickWidth / 2);

  const [isDragging, setIsDragging] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(0);

  const contentRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const scrollThumbRef = useRef(null);

  useEffect(() => {
    const ticks = timestamps.map((timestamp, index) => {
      let time = new Date(timestamp.value);
      let tickLabel = null;
      let tickClass = "slider-minor-tick";
      let tooltipLabel = getFormattedTime(time);
      index = index;
      if (setMajorTick(time)) {
        tickLabel = tooltipLabel;
        tickClass = "slider-major-tick";
      }
      return (
        <div className="tick-container">
          <div className={tickClass} />
          <span className="slider-major-tick-text">{tickLabel}</span>
        </div>
      );
    });
    setSliderTicks(ticks);
  }, []);

  // Listen for mouse events to handle scrolling by dragging the thumb
  useEffect(() => {
    document.addEventListener("mousemove", handleThumbMousemove);
    document.addEventListener("mouseup", handleThumbMouseup);
    document.addEventListener("mouseleave", handleThumbMouseup);
    return () => {
      document.removeEventListener("mousemove", handleThumbMousemove);
      document.removeEventListener("mouseup", handleThumbMouseup);
      document.removeEventListener("mouseleave", handleThumbMouseup);
    };
  }, [handleThumbMousemove, handleThumbMouseup]);

  useEffect(() => {
    if (scrollSpeed === 0) return;
    const interval = setInterval(() => {
      if (contentRef.current && isDragging) {
        contentRef.current.scrollLeft += scrollSpeed;
      }
    }, 16);
    return () => clearInterval(interval);
  }, [scrollSpeed, isDragging]);

  const setMajorTick = (time) => {
    return time.getUTCHours() === 0 || time.getUTCHours() === 12;
  };

  const getFormattedTime = (time) => {
    let formatter = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    };

    formatter["timeZone"] = "UTC";
    return time.toLocaleDateString(props.i18n.language, formatter);
  };

  const handleThumbMousedown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleThumbMouseup = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isDragging) {
        const tickOffset = tickWidth / 2;
        const thumbOffset = thumbWidth / 2;

        const posX = e.clientX;
        const contentScrollLeft = contentRef.current.scrollLeft;
        const trackLeft = scrollTrackRef.current.getBoundingClientRect().x;

        // calculate the position of the thumb relative to the content
        // by accounting for the track's position, current scroll, and offsets
        const contentPos =
          contentScrollLeft + (posX - trackLeft) - trackOffset - tickOffset;

        // determine the index of the next timestamp
        let tickIndex = Math.round((contentPos + thumbOffset) / tickWidth);
        if (tickIndex >= timestamps.length) tickIndex = timestamps.length - 1;
        if (tickIndex < 0) tickIndex = 0;

        setSelected(timestamps[tickIndex].value);

        // update the position of the thumb to snap to the nearest tick
        let nextThumbPosX =
          tickIndex * tickWidth +
          tickOffset +
          trackOffset -
          contentScrollLeft -
          thumbOffset;

        setThumbLeft(nextThumbPosX);

        setIsDragging(false);
      }
    },
    [isDragging],
  );

  const handleThumbMousemove = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragging) {
        // get current position of scroll elements
        const trackRect = scrollTrackRef.current.getBoundingClientRect();
        const trackLeft = trackRect.x;
        const trackRight = trackRect.x + trackRect.width;
        const thumbLeft = scrollThumbRef.current.getBoundingClientRect().x;

        // get current mouse position and determine scroll direction
        const posX = e.clientX;
        const scrollDir = posX - thumbLeft > 0;

        // set scroll speed based on proximity to track edges
        let speed = 0;
        if (!scrollDir && posX < trackLeft + 30) {
          speed = -15;
        } else if (!scrollDir && posX < trackLeft + 60) {
          speed = -5;
        } else if (scrollDir && posX > trackRight - 30) {
          speed = 15;
        } else if (scrollDir && posX > trackRight - 60) {
          speed = 5;
        }
        setScrollSpeed(speed);

        // update the thumb position to follow the mouse, but constrain it within the track bounds
        let nextThumbPosX = posX;
        if (nextThumbPosX < trackLeft) nextThumbPosX = trackLeft;
        if (nextThumbPosX > trackRight - 15)
          nextThumbPosX = trackRight - tickWidth / 2 + 2;
        setThumbLeft(nextThumbPosX - trackLeft);
      }
    },
    [isDragging, thumbLeft],
  );

  return (
    <>
      <div className="time-slider-container">
        <div className="scroll-container" ref={contentRef}>
          {sliderTicks}
        </div>
        <div className="custom-scrollbars__scrollbar">
          <div className="custom-scrollbars__track-and-thumb">
            <div
              className="custom-scrollbars__track"
              ref={scrollTrackRef}
            ></div>
            <div
              className="custom-scrollbars__thumb"
              ref={scrollThumbRef}
              onMouseDown={handleThumbMousedown}
              style={{
                left: `${thumbLeft}px`,
                cursor: isDragging ? "grabbing" : "grab",
              }}
            ></div>
          </div>
        </div>
        <p
          style={{
            position: "absolute",
            top: "150px",
          }}
        >
          {selected}
        </p>
      </div>
    </>
  );
}

export default withTranslation()(TimeSlider);
