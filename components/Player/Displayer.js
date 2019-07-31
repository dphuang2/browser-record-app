import {
  forwardRef, useEffect, useState, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Replayer } from 'rrweb';

const Displayer = forwardRef(({ replay }, ref) => {
  const wrapperRef = useRef();
  const [scale, setScale] = useState();
  const [availableWidth, setAvailableWidth] = useState();
  const [availableHeight, setAvailableHeight] = useState();
  const [contentWidth, setContentWidth] = useState();
  const [contentHeight, setContentHeight] = useState();

  const setAvailableDimensions = () => {
    if (!wrapperRef || !wrapperRef.current) return;
    const { width, height } = wrapperRef.current.getBoundingClientRect();
    setAvailableWidth(width);
    setAvailableHeight(height);
  };

  useEffect(() => {
    const replayer = new Replayer(replay.events, {
      root: ref.current,
    });
    replayer.play();
    replayer.on('resize', (event) => {
      setContentWidth(event.width);
      setContentHeight(event.height);
      setAvailableDimensions();
    });
    window.addEventListener('resize', setAvailableDimensions);
  }, []);

  useEffect(() => {
    // Scale iframe wrapper based on available width/height and content
    // width/height. Also account for browser lack of precision for transform
    // CSS property by decreasing available width and height.
    setScale(Math.min(
      (availableWidth - 7) / contentWidth,
      (availableHeight - 7) / contentHeight,
    ));
  }, [availableWidth, availableHeight, contentWidth, contentHeight]);


  return (
    <div ref={wrapperRef} className="wrapper">
      <div
        className="display"
        ref={ref}
      />
      <style jsx>
        {`
.wrapper {
  position: absolute;
  width: 90%;
  height: 100%;
  top:50%;
  left:50%;
  transform: translate(-50%,-50%);
}
.display {
  background: white;
  position: fixed;
  transform-origin: 0 0;
  left: 50%;
  transform: translate(-${50 * scale}%, -${50 * scale}%) scale(${scale});
  top: 50%;
}
          `}
      </style>
      <style jsx global>
        {`
iframe {
  border: none;
  pointer-events: none;
}
`}
      </style>
    </div>
  );
});

Displayer.propTypes = {
  ref: PropTypes.elementType.isRequired,
  replay: PropTypes.shape({
    events: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default Displayer;
