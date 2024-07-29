import {
  Avatar,
  Badge,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Popover,
  Select,
  Switch,
  TextField,
  ToggleButton,
  Typography,
} from "@mui/material";
import {
  Add,
  Check,
  RotateLeft,
  Save as SaveIcon,
  Sort,
  SortOutlined,
  FilterAlt as Filter,
  FilterAltOutlined as FilterOutline,
} from "@mui/icons-material";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useCurrentEvent, useStrapi } from "../../../utils/apiClient";
import { CardThumb } from "../../../components/widgets/CardThumb";
import rarityNormal from "../../../assets/rarity_star_normal.png";
import rarityAfterTraining from "../../../assets/rarity_star_afterTraining.png";
import rarityBirthday from "../../../assets/rarity_birthday.png";
import {
  attrSelectReducer,
  characterSelectReducer,
  raritySelectReducer,
  supportUnitSelectReducer,
} from "../../../stores/reducers";
import {
  attrIconMap,
  charaIcons,
  UnitLogoMiniMap,
} from "../../../utils/resources";
import {
  ICardInfo,
  IEventDeckBonus,
  IEventInfo,
  IGameCharaUnit,
  IUnitProfile,
} from "../../../types.d";
import {
  cardRarityTypeToRarity,
  useAlertSnackbar,
  useCachedData,
  useLocalStorage,
  useToggle,
} from "../../../utils";
import { ContentTrans } from "../../../components/helpers/ContentTrans";
import { useAssetI18n, useCharaName } from "../../../utils/i18n";
import { useRootStore } from "../../../stores/root";
import { ISekaiCardState, ISekaiCardTeam } from "../../../stores/sekai";
import { observer } from "mobx-react-lite";
import { autorun } from "mobx";
import FilterCardsModal from "../../../components/widgets/FilterCardsModal";
import TypographyCaption from "../../../components/styled/TypographyCaption";

const SekaiUserCardList = observer(() => {
  const { t } = useTranslation();
  const {
    jwtToken,
    sekai: { sekaiCardTeamMap, setSekaiCardTeam },
    region,
  } = useRootStore();
  const { putSekaiCards, deleteSekaiCards } = useStrapi(jwtToken, region);
  const getCharaName = useCharaName();
  const { currEvent, isLoading: isCurrEventLoading } = useCurrentEvent();
  const { getTranslated } = useAssetI18n();
  const { showError, showSuccess } = useAlertSnackbar();

  const [cards] = useCachedData<ICardInfo>("cards");
  const [events] = useCachedData<IEventInfo>("events");
  const [eventDeckBonuses] = useCachedData<IEventDeckBonus>("eventDeckBonuses");
  const [charaUnits] = useCachedData<IGameCharaUnit>("gameCharacterUnits");
  const [unitProfiles] = useCachedData<IUnitProfile>("unitProfiles");

  const [cardList, setCardList] = useState<ISekaiCardState[]>([]);
  const [card, setCard] = useState<ISekaiCardState>();
  const [editList, setEditList] = useState<ISekaiCardState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCardIds, setDeleteCardIds] = useState<number[]>([]);
  const [addCardIds, setAddCardIds] = useState<number[]>([]);
  const [filterOpen, toggleFilterOpen] = useToggle(false);
  const [excludedCardIds, setExcludedCardIds] = useState<number[]>([]);
  const [characterSelected, dispatchCharacterSelected] = useReducer(
    characterSelectReducer,
    JSON.parse(
      localStorage.getItem("user-profile-sekai-cards-filter-charas") || "[]"
    )
  );
  const [attrSelected, dispatchAttrSelected] = useReducer(
    attrSelectReducer,
    JSON.parse(
      localStorage.getItem("user-profile-sekai-cards-filter-attrs") || "[]"
    )
  );
  const [raritySelected, dispatchRaritySelected] = useReducer(
    raritySelectReducer,
    JSON.parse(
      localStorage.getItem("user-profile-sekai-cards-filter-rarities") || "[]"
    )
  );
  const [supportUnitSelected, dispatchSupportUnitSelected] = useReducer(
    supportUnitSelectReducer,
    JSON.parse(
      localStorage.getItem("user-profile-sekai-cards-filter-support-units") ||
        "[]"
    )
  );
  const [sortType, setSortType] = useLocalStorage<string>(
    "user-profile-sekai-cards-sort-type",
    "asc"
  );
  const [sortBy, setSortBy] = useLocalStorage<string>(
    "user-profile-sekai-cards-sort-by",
    "id"
  );
  const [addCardDialogVisible, setAddCardDialogVisible] = useState(false);

  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const open = useMemo(() => Boolean(anchorEl), [anchorEl]);

  const [anchorElEvent, setAnchorElEvent] = useState<HTMLButtonElement | null>(
    null
  );
  const eventOpen = useMemo(() => Boolean(anchorElEvent), [anchorElEvent]);
  const [eventId, setEventId] = useState(1);

  const [sekaiCardTeam, setLocalSekaiCardTeam] = useState<ISekaiCardTeam>();

  useEffect(() => {
    autorun(() => {
      setLocalSekaiCardTeam(sekaiCardTeamMap.get(region));
    });
  }, []);

  useEffect(() => {
    if (!!cards && !!cards.length && !!sekaiCardTeam) {
      let _cardList = (sekaiCardTeam.cards || []).map((elem) =>
        Object.assign({}, elem, {
          card: cards.find((c) => c.id === elem.cardId)!,
        })
      );
      // apply modifications
      _cardList = _cardList.filter(
        (card) => !deleteCardIds.includes(card.cardId)
      );
      _cardList = _cardList.map((card) =>
        Object.assign(
          {},
          card,
          editList.find((el) => el.cardId === card.cardId) || {}
        )
      );
      _cardList = [
        ..._cardList,
        ...addCardIds.map((cardId) =>
          Object.assign(
            {},
            editList.find((el) => el.cardId === cardId),
            {
              card: cards.find((c) => c.id === cardId)!,
            }
          )
        ),
      ];
      if (_cardList.length && characterSelected.length) {
        _cardList = _cardList.filter((elem) =>
          characterSelected.includes(elem.card.characterId)
        );
      }
      if (_cardList.length && attrSelected.length) {
        _cardList = _cardList.filter((elem) =>
          attrSelected.includes(elem.card.attr)
        );
      }
      if (_cardList.length && raritySelected.length) {
        const rarityFilter = raritySelected.map((rs) => rs.cardRarityType);
        _cardList = _cardList.filter((c) =>
          rarityFilter.includes(c.card.cardRarityType!)
        );
      }
      if (supportUnitSelected.length) {
        _cardList = _cardList.filter(
          (elem) =>
            elem.card.supportUnit === "none" ||
            supportUnitSelected.includes(elem.card.supportUnit)
        );
      }
      setExcludedCardIds(_cardList.map((cl) => cl.card.id));
      switch (sortBy) {
        case "level":
          setCardList(
            _cardList.sort((a, b) =>
              sortType === "asc" ? a.level - b.level : b.level - a.level
            )
          );
          break;
        case "rarity":
          setCardList(
            _cardList.sort((a, b) =>
              sortType === "asc"
                ? cardRarityTypeToRarity[a.card.cardRarityType] -
                  cardRarityTypeToRarity[b.card.cardRarityType]
                : cardRarityTypeToRarity[b.card.cardRarityType] -
                  cardRarityTypeToRarity[a.card.cardRarityType]
            )
          );
          break;
        default:
          setCardList(
            _cardList
              .sort((a, b) =>
                sortType === "asc"
                  ? a.card[sortBy as "id"] - b.card[sortBy as "id"]
                  : b.card[sortBy as "id"] - a.card[sortBy as "id"]
              )
              .map((card) => {
                const { card: _, ...newCard } = card;
                return newCard;
              })
          );
      }
    }
  }, [
    addCardIds,
    attrSelected,
    cards,
    characterSelected,
    deleteCardIds,
    editList,
    raritySelected,
    region,
    sekaiCardTeam,
    sortBy,
    sortType,
    supportUnitSelected,
  ]);

  useEffect(() => {
    if (!isCurrEventLoading && currEvent) {
      setEventId(currEvent.eventId);
    }
  }, [currEvent, isCurrEventLoading]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, card: ISekaiCardState) => {
      setAnchorEl(event.currentTarget);
      setCard(card);
    },
    []
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setCard(undefined);
  }, []);

  const handleEventClose = useCallback(() => {
    setAnchorElEvent(null);
  }, []);

  const handleChange = useCallback(
    (value: any, key: string) => {
      if (card) {
        const newCard = Object.assign({}, card, {
          [key]: value,
        });
        setCard(newCard);
        // const idx = cardList.findIndex((c) => c.cardId === card.cardId);
        // setCardList((cards) => [
        //   ...cards.slice(0, idx),
        //   newCard,
        //   ...cards.slice(idx + 1),
        // ]);

        const editIdx = editList.findIndex((c) => c.cardId === card.cardId);
        if (editIdx === -1) {
          setEditList((cards) => [...cards, newCard]);
        } else {
          setEditList((cards) => [
            ...cards.slice(0, editIdx),
            newCard,
            ...cards.slice(editIdx + 1),
          ]);
        }
      }
    },
    [card, editList]
  );

  const handleDelete = useCallback(() => {
    if (!card) return;
    const idx = cardList.findIndex((c) => c.cardId === card.cardId);
    const editIdx = editList.findIndex((el) => el.cardId === card.cardId);
    if (editIdx !== -1)
      setEditList((cards) => [
        ...cards.slice(0, editIdx),
        ...cards.slice(editIdx + 1),
      ]);
    const addIdx = addCardIds.findIndex((id) => card.cardId === id);
    if (addIdx !== -1)
      setAddCardIds((ids) => [
        ...ids.slice(0, addIdx),
        ...ids.slice(addIdx + 1),
      ]);
    else setDeleteCardIds((dc) => [...dc, cardList![idx].cardId]);
    // setCardList((cards) => [...cards.slice(0, idx), ...cards.slice(idx + 1)]);
    handleClose();
  }, [addCardIds, card, cardList, editList, handleClose]);

  const handleCardThumbClick = useCallback(
    (card: ICardInfo) => {
      // avoid duplication
      const existedCard =
        cardList.find((_card) => _card.cardId === card.id) ||
        editList.find((_card) => _card.cardId === card.id);

      if (existedCard) return;

      // check is deleted
      const alreadyDeletedIdx = deleteCardIds.findIndex((id) => id === card.id);
      if (alreadyDeletedIdx !== -1) {
        setDeleteCardIds([
          ...deleteCardIds.slice(0, alreadyDeletedIdx),
          ...deleteCardIds.slice(alreadyDeletedIdx + 1),
        ]);
      } else {
        setAddCardIds((ids) => [...ids, card.id]);
      }

      const maxLevel = [0, 20, 30, 50, 60];
      // const maxPower = card.cardParameters
      //   .filter((elem) => elem.cardLevel === maxLevel[card.rarity])
      //   .reduce((sum, elem) => sum + elem.power, 0);
      setEditList((list) => [
        ...list,
        {
          cardId: card.id,
          level: maxLevel[cardRarityTypeToRarity[card.cardRarityType!]],
          masterRank: 0,
          skillLevel: 1,
          story1Unlock: true,
          story2Unlock: true,
          trainable:
            card.cardRarityType !== "rarity_birthday" &&
            cardRarityTypeToRarity[card.cardRarityType!] >= 3,
          trained:
            card.cardRarityType !== "rarity_birthday" &&
            cardRarityTypeToRarity[card.cardRarityType!] >= 3,
        },
      ]);
      // setCardList((list) => [
      //   ...list,
      //   {
      //     cardId: card.id,
      //     masterRank: 0,
      //     skillLevel: 1,
      //     level: maxLevel[card.rarity],
      //     trained: card.rarity >= 3,
      //     story1Unlock: true,
      //     story2Unlock: true,
      //   },
      // ]);
      // setFilteredCards((cards) => cards.filter((c) => c.id !== card.id));
    },
    [cardList, deleteCardIds, editList]
  );

  const getMaxRarity = useCallback(
    (card: ISekaiCardState) => {
      const maxLevel = [0, 20, 30, 50, 60];
      if (cards) {
        const c = cards.find((c) => c.id === card.cardId);
        if (c) {
          const rarity = cardRarityTypeToRarity[c.cardRarityType!];
          let level = maxLevel[rarity];
          if (card.trainable && !card.trained) level -= 10;

          return level;
        }
      }

      return 1;
    },
    [cards]
  );

  return !!sekaiCardTeam ? (
    <Grid container spacing={1}>
      <Grid item xs={12}>
        <Grid container justifyContent="space-between">
          <Grid item>
            <Grid container spacing={1}>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={
                    isSaving || (!editList.length && !deleteCardIds.length)
                  }
                  startIcon={
                    isSaving ? <CircularProgress size={24} /> : <SaveIcon />
                  }
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      if (editList.length)
                        await putSekaiCards(sekaiCardTeam.id, editList);
                      if (deleteCardIds.length)
                        await deleteSekaiCards(sekaiCardTeam.id, deleteCardIds);
                      setEditList([]);
                      setDeleteCardIds([]);
                      setAddCardIds([]);
                      const sct = Object.assign({}, sekaiCardTeam, {
                        cards: cardList,
                      });
                      setSekaiCardTeam(sct, region);
                      // setSekaiCardTeam(sct);
                      showSuccess(t("user:profile.card_list.submit_success"));
                    } catch (error) {
                      showError(t("user:profile.card_list.submit_error"));
                    }
                    setIsSaving(false);
                  }}
                >
                  {t("common:save")}
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={
                    isSaving || (!deleteCardIds.length && !editList.length)
                  }
                  onClick={() => {
                    setEditList([]);
                    setDeleteCardIds([]);
                    setAddCardIds([]);
                    setCardList(
                      sekaiCardTeam.cards ? [...sekaiCardTeam.cards] : []
                    );
                  }}
                  startIcon={<RotateLeft />}
                >
                  {t("common:reset")}
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={isSaving}
                  onClick={() => {
                    setAddCardDialogVisible(true);
                  }}
                  startIcon={<Add />}
                >
                  {t("user:profile.card_list.button.add_card")}
                </Button>
              </Grid>
            </Grid>
          </Grid>
          <Grid item>
            <Grid container spacing={1}>
              <Grid item>
                <Badge
                  color="secondary"
                  variant="dot"
                  invisible={
                    !characterSelected.length &&
                    !attrSelected.length &&
                    !raritySelected.length
                  }
                >
                  <ToggleButton
                    value=""
                    color="primary"
                    selected={filterOpen}
                    onClick={() => toggleFilterOpen()}
                  >
                    {filterOpen ? <Filter /> : <FilterOutline />}
                    {filterOpen ? <Sort /> : <SortOutlined />}
                  </ToggleButton>
                </Badge>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Collapse in={filterOpen}>
          <Grid container direction="column" spacing={2}>
            <Grid item container xs={12} alignItems="center" spacing={1}>
              <Grid item xs={12} md={1}>
                <TypographyCaption>
                  {t("filter:character.caption")}
                </TypographyCaption>
              </Grid>
              <Grid item xs={12} md={11}>
                <Grid container spacing={1}>
                  {Array.from({ length: 26 }).map((_, idx) => (
                    <Grid key={"chara-filter-" + idx} item>
                      <Chip
                        clickable
                        color={
                          characterSelected.includes(idx + 1)
                            ? "primary"
                            : "default"
                        }
                        avatar={
                          <Avatar
                            alt={getCharaName(idx + 1)}
                            src={
                              charaIcons[`CharaIcon${idx + 1}` as "CharaIcon1"]
                            }
                          />
                        }
                        label={getCharaName(idx + 1)}
                        onClick={() => {
                          if (characterSelected.includes(idx + 1)) {
                            dispatchCharacterSelected({
                              payload: idx + 1,
                              storeName:
                                "user-profile-sekai-cards-filter-charas",
                              type: "remove",
                            });
                          } else {
                            dispatchCharacterSelected({
                              payload: idx + 1,
                              storeName:
                                "user-profile-sekai-cards-filter-charas",
                              type: "add",
                            });
                          }
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
            <Grid item container xs={12} alignItems="center" spacing={1}>
              <Grid item xs={12} md={1}>
                <TypographyCaption>{t("common:attribute")}</TypographyCaption>
              </Grid>
              <Grid item xs={12} md={11}>
                <Grid container spacing={1}>
                  {["cute", "mysterious", "cool", "happy", "pure"].map(
                    (attr) => (
                      <Grid key={"attr-filter-" + attr} item>
                        <Chip
                          clickable
                          color={
                            attrSelected.includes(attr) ? "primary" : "default"
                          }
                          avatar={
                            <Avatar
                              alt={attr}
                              src={attrIconMap[attr as "cool"]}
                            />
                          }
                          label={
                            <Typography
                              variant="body2"
                              style={{ textTransform: "capitalize" }}
                            >
                              {attr}
                            </Typography>
                          }
                          onClick={() => {
                            if (attrSelected.includes(attr)) {
                              dispatchAttrSelected({
                                payload: attr,
                                storeName:
                                  "user-profile-sekai-cards-filter-attrs",
                                type: "remove",
                              });
                            } else {
                              dispatchAttrSelected({
                                payload: attr,
                                storeName:
                                  "user-profile-sekai-cards-filter-attrs",
                                type: "add",
                              });
                            }
                          }}
                        />
                      </Grid>
                    )
                  )}
                </Grid>
              </Grid>
            </Grid>
            {characterSelected.some((cId) => cId >= 21) && (
              <Grid
                item
                container
                xs={12}
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Grid item xs={12} md={1}>
                  <TypographyCaption>
                    {t("common:support_unit")}
                  </TypographyCaption>
                </Grid>
                <Grid item xs={12} md={11}>
                  <Grid container spacing={1}>
                    {unitProfiles &&
                      [
                        "theme_park",
                        "street",
                        "idol",
                        "school_refusal",
                        "light_sound",
                      ].map((supportUnit) => (
                        <Grid key={"supportUnit-filter-" + supportUnit} item>
                          <Chip
                            clickable
                            color={
                              supportUnitSelected.includes(supportUnit)
                                ? "primary"
                                : "default"
                            }
                            avatar={
                              <Avatar
                                alt={supportUnit}
                                src={UnitLogoMiniMap[supportUnit as "idol"]}
                              />
                            }
                            label={
                              <Typography variant="body2">
                                {getTranslated(
                                  `unit_profile:${supportUnit}.name`,
                                  unitProfiles.find(
                                    (up) => up.unit === supportUnit
                                  )!.unitName
                                )}
                              </Typography>
                            }
                            onClick={() => {
                              if (supportUnitSelected.includes(supportUnit)) {
                                dispatchSupportUnitSelected({
                                  payload: supportUnit,
                                  storeName:
                                    "user-profile-sekai-cards-filter-support-units",
                                  type: "remove",
                                });
                              } else {
                                dispatchSupportUnitSelected({
                                  payload: supportUnit,
                                  storeName:
                                    "user-profile-sekai-cards-filter-support-units",
                                  type: "add",
                                });
                              }
                            }}
                          />
                        </Grid>
                      ))}
                  </Grid>
                </Grid>
              </Grid>
            )}
            <Grid item container xs={12} alignItems="center" spacing={1}>
              <Grid item xs={12} md={1}>
                <TypographyCaption>{t("card:rarity")}</TypographyCaption>
              </Grid>
              <Grid item xs={12} md={11}>
                <Grid container spacing={1}>
                  {[1, 2, 3, 4, 5].map((rarity) => (
                    <Grid key={rarity} item>
                      <Chip
                        clickable
                        color={
                          raritySelected.map((rs) => rs.rarity).includes(rarity)
                            ? "primary"
                            : "default"
                        }
                        label={
                          <Grid container>
                            {Array.from({
                              length: rarity === 5 ? 1 : rarity,
                            }).map((_, idx) => (
                              <Grid item key={`rarity-${idx}`}>
                                <img
                                  src={
                                    rarity >= 5
                                      ? rarityBirthday
                                      : rarity >= 3
                                        ? rarityAfterTraining
                                        : rarityNormal
                                  }
                                  alt="rarity star"
                                  height="16"
                                ></img>
                              </Grid>
                            ))}
                          </Grid>
                        }
                        onClick={() => {
                          if (
                            raritySelected
                              .map((rs) => rs.rarity)
                              .includes(rarity)
                          ) {
                            dispatchRaritySelected({
                              payload: {
                                cardRarityType:
                                  rarity === 5
                                    ? "rarity_birthday"
                                    : `rarity_${rarity}`,
                                rarity,
                              },
                              storeName:
                                "user-profile-sekai-cards-filter-rarities",
                              type: "remove",
                            });
                          } else {
                            dispatchRaritySelected({
                              payload: {
                                cardRarityType:
                                  rarity === 5
                                    ? "rarity_birthday"
                                    : `rarity_${rarity}`,
                                rarity,
                              },
                              storeName:
                                "user-profile-sekai-cards-filter-rarities",
                              type: "add",
                            });
                          }
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
            <Grid item container xs={12} alignItems="center" spacing={1}>
              <Grid item xs={12} md={1}>
                <TypographyCaption>
                  {t("filter:sort.caption")}
                </TypographyCaption>
              </Grid>
              <Grid item xs={12} md={11}>
                <Grid container spacing={1}>
                  <Grid item>
                    <FormControl>
                      <Select
                        value={sortType}
                        onChange={(e) => {
                          setSortType(e.target.value as string);
                        }}
                        style={{ minWidth: "100px" }}
                      >
                        <MenuItem value="asc">
                          {t("filter:sort.ascending")}
                        </MenuItem>
                        <MenuItem value="desc">
                          {t("filter:sort.descending")}
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item>
                    <FormControl>
                      <Select
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value as string);
                        }}
                        style={{ minWidth: "100px" }}
                      >
                        <MenuItem value="id">{t("common:id")}</MenuItem>
                        <MenuItem value="rarity">{t("common:rarity")}</MenuItem>
                        <MenuItem value="level">{t("common:level")}</MenuItem>
                        <MenuItem value="releaseAt">
                          {t("common:startAt")}
                        </MenuItem>
                        <MenuItem value="power" disabled>
                          {t("card:power")}
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid
              item
              container
              xs={12}
              alignItems="center"
              // justify="space-between"
              spacing={1}
            >
              <Grid item xs={false} md={1}></Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={
                    !characterSelected.length &&
                    !attrSelected.length &&
                    // !skillSelected.length &&
                    !raritySelected.length
                  }
                  onClick={() => {
                    dispatchCharacterSelected({
                      payload: 0,
                      storeName: "user-profile-sekai-cards-filter-charas",
                      type: "reset",
                    });
                    dispatchAttrSelected({
                      payload: "",
                      storeName: "user-profile-sekai-cards-filter-attrs",
                      type: "reset",
                    });
                    dispatchRaritySelected({
                      payload: {
                        cardRarityType: "",
                        rarity: 0,
                      },
                      storeName: "user-profile-sekai-cards-filter-rarities",
                      type: "reset",
                    });
                    // dispatchSkillSelected({
                    //   type: "reset",
                    //   payload: "",
                    // });
                    dispatchSupportUnitSelected({
                      payload: "",
                      storeName:
                        "user-profile-sekai-cards-filter-support-units",
                      type: "reset",
                    });
                  }}
                  startIcon={<RotateLeft />}
                >
                  {t("common:reset")}
                </Button>
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!events || !eventDeckBonuses || !charaUnits}
                  onClick={(e) => {
                    setAnchorElEvent(e.currentTarget);
                  }}
                >
                  {t("card:apply_event_filter")}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Collapse>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={1}>
          {/* {JSON.stringify(cardList)} */}
          {cardList.map((card) => (
            <Grid item xs={3} sm={2} lg={1} key={card.cardId}>
              <CardThumb
                cardId={card.cardId}
                trained={Boolean(card.trained)}
                level={card.level}
                masterRank={card.masterRank}
                onClick={(e) => handleClick(e, card)}
                style={{ cursor: "pointer" }}
              />
            </Grid>
          ))}
        </Grid>
      </Grid>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          horizontal: "center",
          vertical: "top",
        }}
        transformOrigin={{
          horizontal: "center",
          vertical: "bottom",
        }}
      >
        {card && (
          <Container>
            <Grid container direction="column" spacing={1}>
              <Grid item>
                <TextField
                  label={t("card:cardLevel")}
                  value={card.level}
                  type="number"
                  onChange={(e) =>
                    handleChange(Number(e.target.value), "level")
                  }
                  inputProps={{
                    max: getMaxRarity(card),
                    min: "1",
                  }}
                  fullWidth
                />
              </Grid>
              <Grid item>
                <TextField
                  label={t(
                    "user:profile.import_card.table.row.card_master_rank"
                  )}
                  value={card.masterRank}
                  type="number"
                  onChange={(e) =>
                    handleChange(Number(e.target.value), "masterRank")
                  }
                  inputProps={{
                    max: "5",
                    min: "0",
                  }}
                  fullWidth
                />
              </Grid>
              <Grid item>
                <TextField
                  label={t("card:skillLevel")}
                  value={card.skillLevel}
                  type="number"
                  onChange={(e) =>
                    handleChange(Number(e.target.value), "skillLevel")
                  }
                  inputProps={{
                    max: "4",
                    min: "1",
                  }}
                  fullWidth
                />
              </Grid>
              <Grid item>
                <FormControlLabel
                  control={<Switch checked={Boolean(card.trained)} />}
                  label={t("card:trained") as string}
                  onChange={(e, checked) => handleChange(checked, "trained")}
                />
              </Grid>
              <Grid item>
                <FormControlLabel
                  control={<Switch checked={Boolean(card.story1Unlock)} />}
                  label={t("card:sideStory1Unlocked") as string}
                  onChange={(e, checked) =>
                    handleChange(checked, "story1Unlock")
                  }
                />
              </Grid>
              <Grid item>
                <FormControlLabel
                  control={<Switch checked={Boolean(card.story2Unlock)} />}
                  label={t("card:sideStory2Unlocked") as string}
                  onChange={(e, checked) =>
                    handleChange(checked, "story2Unlock")
                  }
                />
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleDelete}
                >
                  {t("common:delete")}
                </Button>
              </Grid>
            </Grid>
          </Container>
        )}
      </Popover>
      <FilterCardsModal
        open={addCardDialogVisible}
        onCardSelected={handleCardThumbClick}
        onClose={() => setAddCardDialogVisible(false)}
        excludeCardIds={excludedCardIds}
      />
      <Popover
        open={eventOpen}
        anchorEl={anchorElEvent}
        onClose={handleEventClose}
        anchorOrigin={{
          horizontal: "center",
          vertical: "top",
        }}
        transformOrigin={{
          horizontal: "center",
          vertical: "bottom",
        }}
      >
        <Container style={{ paddingBottom: "1em", paddingTop: "1em" }}>
          <TextField
            select
            label={t("common:event")}
            value={eventId}
            onChange={(e) => setEventId(Number(e.target.value))}
            InputProps={{
              endAdornment: (
                <InputAdornment position="start">
                  <IconButton
                    size="small"
                    onClick={() => {
                      const bonuses = eventDeckBonuses!.filter(
                        (edb) => edb.eventId === eventId && edb.bonusRate === 50
                      );
                      // console.log(bonuses, eventId, eventDeckBonuses);
                      const attr = bonuses[0].cardAttr;
                      dispatchRaritySelected({
                        payload: {
                          cardRarityType: "",
                          rarity: 0,
                        },
                        storeName: "user-profile-sekai-cards-filter-rarities",
                        type: "reset",
                      });
                      dispatchAttrSelected({
                        payload: attr,
                        storeName: "user-profile-sekai-cards-filter-attrs",
                        type: "add",
                      });
                      const charas = bonuses.map(
                        (bonus) =>
                          charaUnits!.find(
                            (cu) => cu.id === bonus.gameCharacterUnitId
                          )!
                      );
                      dispatchCharacterSelected({
                        payload: 0,
                        storeName: "user-profile-sekai-cards-filter-charas",
                        type: "reset",
                      });
                      charas.forEach((chara) =>
                        dispatchCharacterSelected({
                          payload: chara.gameCharacterId,
                          storeName: "user-profile-sekai-cards-filter-charas",
                          type: "add",
                        })
                      );
                      dispatchSupportUnitSelected({
                        payload: "",
                        storeName:
                          "user-profile-sekai-cards-filter-support-units",
                        type: "reset",
                      });
                      charas
                        .filter((chara) => chara.gameCharacterId >= 21)
                        .forEach((chara) => {
                          dispatchSupportUnitSelected({
                            payload: chara.unit,
                            storeName:
                              "user-profile-sekai-cards-filter-support-units",
                            type: "add",
                          });
                        });
                      handleEventClose();
                    }}
                    disabled={eventId === 0}
                  >
                    <Check />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          >
            {events &&
              events.map((ev) => (
                <MenuItem key={ev.id} value={ev.id}>
                  <ContentTrans
                    original={ev.name}
                    contentKey={`event_name:${ev.id}`}
                  />
                </MenuItem>
              ))}
          </TextField>
        </Container>
      </Popover>
    </Grid>
  ) : null;
});

export default SekaiUserCardList;
