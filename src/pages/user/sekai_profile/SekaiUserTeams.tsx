import React, { useState } from "react";
import { ITeamCardState } from "../../../types.d";
import TeamBuilder from "../../../components/blocks/TeamBuilder";

const SekaiUserTeams = () => {
  const [teamCards, setTeamCards] = useState<number[]>([]);
  const [teamCardsStates, setTeamCardsStates] = useState<ITeamCardState[]>([]);
  const [teamTotalPower, setTeamTotalPower] = useState<number>(0);

  return (
    <TeamBuilder
      teamCards={teamCards}
      teamCardsStates={teamCardsStates}
      teamTotalPower={teamTotalPower}
      setTeamCards={setTeamCards}
      setTeamCardsStates={setTeamCardsStates}
      setTeamTotalPower={setTeamTotalPower}
    ></TeamBuilder>
  );
};

export default SekaiUserTeams;