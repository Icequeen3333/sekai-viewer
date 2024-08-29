import {
  Grid,
  Typography,
  Button,
  Tooltip,
  CircularProgress,
  TextField,
} from "@mui/material";
import { Update } from "@mui/icons-material";
import { Autocomplete } from "@mui/material";
import React, { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SekaiProfileEventRecordModel } from "../../../strapi-model";
import { IEventInfo } from "../../../types.d";
import { useAlertSnackbar, useCachedData } from "../../../utils";
import { useCurrentEvent, useStrapi } from "../../../utils/apiClient";
import { useAssetI18n } from "../../../utils/i18n";
import { LoadingButton } from "@mui/lab";
import { useRootStore } from "../../../stores/root";
import { ISekaiProfile } from "../../../stores/sekai";
import { observer } from "mobx-react-lite";
import { autorun } from "mobx";

interface Props {
  eventId?: number;
}

const SekaiEventRecord = observer((props: Props) => {
  // const layoutClasses = useLayoutStyles();
  // const interactiveClasses = useInteractiveStyles();
  const { t } = useTranslation();
  const {
    jwtToken,
    sekai: { sekaiProfileMap, setSekaiProfile },
    settings: { contentTransMode },
    region,
  } = useRootStore();
  const { getSekaiProfileEventRecordMe, postSekaiProfileEventRecord } =
    useStrapi(jwtToken, region);
  const { getTranslated } = useAssetI18n();
  const { showError } = useAlertSnackbar();

  const { currEvent, isLoading: isCurrEventLoading } = useCurrentEvent();

  const [events] = useCachedData<IEventInfo>("events");
  const [selectedEvent, setSelectedEvent] = useState<{
    name: string;
    id: number;
  } | null>(null);
  // const [currentEvent, setCurrentEvent] = useState<SekaiCurrentEventModel>();
  const [eventRecords, setEventRecords] = useState<
    SekaiProfileEventRecordModel[]
  >([]);
  const [isEventRecording, setIsEventRecording] = useState(false);
  const [sekaiProfile, setLocalSekaiProfile] = useState<ISekaiProfile>();

  useEffect(() => {
    autorun(() => {
      setLocalSekaiProfile(sekaiProfileMap.get(region));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const func = async () => {
      // console.log(currEvent);
      if (props.eventId && events) {
        try {
          const ev = events.find((elem) => elem.id === props.eventId);
          if (ev) {
            setSelectedEvent({
              name: getTranslated(`event_name:${currEvent.eventId}`, ev.name),
              id: ev.id,
            });
          }
          setEventRecords(await getSekaiProfileEventRecordMe(props.eventId));
        } catch (error) {
          setEventRecords([]);
        }
      } else if (currEvent && events) {
        const ev = events.find((elem) => elem.id === Number(currEvent.eventId));
        if (ev) {
          setSelectedEvent({
            name: getTranslated(`event_name:${currEvent.eventId}`, ev.name),
            id: ev.id,
          });
        }
        try {
          setEventRecords(
            await getSekaiProfileEventRecordMe(currEvent.eventId)
          );
        } catch (error) {
          setEventRecords([]);
        }
      }
    };

    func();
  }, [
    contentTransMode,
    currEvent,
    events,
    getSekaiProfileEventRecordMe,
    getTranslated,
    props.eventId,
  ]);

  return (
    <Grid container direction="column" spacing={1}>
      {!props.eventId && (
        <Grid item>
          <Grid container spacing={1} alignItems="center">
            <Grid item>
              <Autocomplete
                options={(events || [])
                  .filter((event) => event.startAt <= new Date().getTime())
                  .slice()
                  .reverse()
                  .map((ev) => ({
                    name: getTranslated(`event_name:${ev.id}`, ev.name),
                    id: ev.id,
                  }))}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t("event:tracker.select.event_name")}
                  />
                )}
                value={selectedEvent}
                autoComplete
                onChange={async (_, value) => {
                  setSelectedEvent(value);
                  setEventRecords([]);
                  if (value)
                    setEventRecords(
                      await getSekaiProfileEventRecordMe(value.id)
                    );
                }}
                disabled={isCurrEventLoading || isEventRecording}
                style={{
                  minWidth: "250px",
                }}
              />
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                onClick={async () => {
                  setSelectedEvent({
                    name: getTranslated(
                      `event_name:${currEvent.eventId}`,
                      currEvent.eventJson.name
                    ),
                    id: currEvent.eventId,
                  });
                  setEventRecords([]);
                  setEventRecords(
                    await getSekaiProfileEventRecordMe(currEvent.eventId)
                  );
                }}
                disabled={!currEvent || isCurrEventLoading || isEventRecording}
                size="large"
              >
                {t("event:tracker.button.curr_event")}
              </Button>
            </Grid>
          </Grid>
        </Grid>
      )}
      <Grid item container spacing={1} alignItems="center">
        {!!selectedEvent &&
          !!currEvent &&
          selectedEvent.id === currEvent.eventId &&
          !!sekaiProfile && (
            <Grid item>
              <Tooltip
                title={
                  t("user:profile.label.update_left", {
                    allowed: sekaiProfile.eventGetAvailable,
                    used: sekaiProfile.eventGetUsed,
                  }) as string
                }
                disableFocusListener
                arrow
              >
                <span>
                  <LoadingButton
                    size="small"
                    loading={isEventRecording}
                    variant="contained"
                    onClick={async () => {
                      setIsEventRecording(true);
                      try {
                        await postSekaiProfileEventRecord(currEvent!.eventId);
                        setEventRecords(await getSekaiProfileEventRecordMe());
                        setSekaiProfile(
                          {
                            eventGetUsed: sekaiProfile.eventGetUsed + 1,
                          },
                          region
                        );
                        // setSekaiProfile(sp);
                        setIsEventRecording(false);
                      } catch (error: any) {
                        showError(error.message);
                        setIsEventRecording(false);
                      }
                    }}
                    disabled={
                      isCurrEventLoading ||
                      isEventRecording ||
                      sekaiProfile.eventGetAvailable <=
                        sekaiProfile.eventGetUsed
                    }
                    startIcon={<Update />}
                  >
                    {t("common:update")}
                  </LoadingButton>
                </span>
              </Tooltip>
            </Grid>
          )}
        <Grid item>
          <Typography>{t("user:profile.event.current_record_info")}</Typography>
        </Grid>
        {!eventRecords && <CircularProgress size={24} />}
        {!!eventRecords && eventRecords[0] && (
          <Fragment>
            <Grid item>
              <Typography>
                {t("user:profile.event.current_record_point")}{" "}
                {eventRecords[0].eventPoint}
              </Typography>
            </Grid>
            <Grid item>
              <Typography>
                {t("user:profile.event.current_record_rank")}{" "}
                {eventRecords[0].eventRank}
              </Typography>
            </Grid>
            <Grid item>
              <Typography>
                {t("user:profile.event.current_record_time")}{" "}
                {new Date(eventRecords[0].created_at).toLocaleString()}
              </Typography>
            </Grid>
          </Fragment>
        )}
      </Grid>
    </Grid>
  );
});

export default SekaiEventRecord;
