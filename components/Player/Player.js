import {
  useRef, useEffect, useState,
} from 'react';

import PropTypes from 'prop-types';
import Controller from './Controller';
import Displayer from './Displayer';
import 'rrweb/dist/rrweb.min.css';

const Player = ({ replay, handleOutsideClick }) => {
  const displayerRef = useRef();
  const controllerRef = useRef();
  const [totalTime, setTotalTime] = useState(0);
  const [newPlayPercentage, setNewPlayPercentage] = useState(0);
  const [percentageWatched, setPercentageWatched] = useState(0);
  const [playing, setPlaying] = useState(true);

  const handleClick = (event) => {
    if (
      (displayerRef
      && displayerRef.current
      && displayerRef.current.contains(event.target))
      || (controllerRef
        && controllerRef.current
        && controllerRef.current.contains(event.target))
    ) return;

    handleOutsideClick();
  };

  return (
    <div
      className="player-container"
      onClick={handleClick}
      role="presentation"
    >
      <Displayer
        newPlayPercentage={newPlayPercentage}
        percentageWatched={percentageWatched}
        setPercentageWatched={setPercentageWatched}
        setTotalTime={setTotalTime}
        displayerRef={displayerRef}
        playing={playing}
        replay={replay}
      />
      <Controller
        setPlaying={setPlaying}
        totalTime={totalTime}
        setNewPlayPercentage={setNewPlayPercentage}
        percentageWatched={percentageWatched}
        playing={playing}
        controllerRef={controllerRef}
      />
      <style jsx>
        {`
        .player-container {
    position: fixed;
    top: 0;
    left: 0;
    width:100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 999999;
    display: block;
  }
    `}
      </style>
    </div>
  );
};

Player.propTypes = {
  handleOutsideClick: PropTypes.func.isRequired,
  replay: PropTypes.shape({
    events: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default Player;
