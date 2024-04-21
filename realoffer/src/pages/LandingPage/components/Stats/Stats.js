// Stats.js
import React, {useState} from 'react';
import CountUp from 'react-countup';
import './Stats.css';
import VisibilitySensor from 'react-visibility-sensor';
import users from './users.svg'; // path to your users icon
import database from './database.svg'; // path to your homes icon
import homes from './homes.svg'; // path to your sold icon

const Stats = () => {
  const [focus, setFocus] = useState(false);

  const onChangeVisibility = (isVisible) => {
    if (isVisible) {
      setFocus(true);
    }
  };

  return (
    <div className="stats-container">
      <VisibilitySensor onChange={onChangeVisibility} delayedCall>
        <div className="stat">
          <img src={users} alt="" className="stat-icon" />
          <CountUp start={focus ? 0 : null} end={2522} duration={2.75} redraw={true}>
            {({ countUpRef }) => <span ref={countUpRef} />}
          </CountUp>
          <p>Users on Our Platform</p>
        </div>
      </VisibilitySensor>

      <VisibilitySensor onChange={onChangeVisibility} delayedCall>
        <div className="stat">
          <img src={database} alt="" className="stat-icon" />
          <CountUp start={focus ? 0 : null} end={12532} duration={2.75} redraw={true}>
            {({ countUpRef }) => <span ref={countUpRef} />}
          </CountUp>
          <p>Homes in Our Database</p>
        </div>
      </VisibilitySensor>

      <VisibilitySensor onChange={onChangeVisibility} delayedCall>
        <div className="stat">
          <img src={homes} alt="" className="stat-icon" />
          <CountUp start={focus ? 0 : null} end={671} duration={2.75} redraw={true}>
            {({ countUpRef }) => <span ref={countUpRef} />}
          </CountUp>
          <p>Homes Sold</p>
        </div>
      </VisibilitySensor>
    </div>
  );
};

export default Stats;
