import {
  Avatar,
  Button,
  Card,
  Chip,
  CircularProgress,
  Fab,
  Grid,
  Link,
  styled,
  Typography,
} from "@mui/material";
import { CloudDownload, PlayArrow, Stop } from "@mui/icons-material";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Howl } from "howler";
import { charaIcons } from "../../utils/resources";
import { useEffect } from "react";
import Image from "mui-image";
import MoviePlayer from "../../components/blocks/MoviePlayer";

const CardStyled = styled(Card)(({ theme }) => ({
  margin: theme.spacing(1.5, 0),
  padding: theme.spacing(1.5, 0),
}));

export const AudioPlayButton: React.FC<{ url: string }> = ({ url }) => {
  const [isPlay, setIsPlay] = useState(false);
  const [audioSource, setAudioSource] = useState<Howl>();
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const PlayAudio = useCallback(() => {
    if (!isPlay) {
      if (audioSource) {
        audioSource.play();
        return;
      }
      setIsAudioLoading(true);
      const audio = new Howl({
        src: [url],
      });
      audio.on("load", () => {
        setIsAudioLoading(false);
        audio.play();
      });
      audio.on("play", () => {
        setIsPlay(true);
      });
      audio.on("end", () => {
        setIsPlay(false);
      });
      setAudioSource(audio);
    } else {
      if (audioSource) {
        audioSource.stop();
      }
      setIsPlay(false);
    }
  }, [url, audioSource, isPlay]);

  useEffect(() => {
    return () => {
      if (audioSource) {
        audioSource.stop();
        audioSource.unload();
      }
    };
  }, [audioSource]);

  return (
    <Grid container spacing={1}>
      <Grid item>
        <Fab onClick={PlayAudio} size="small">
          {isPlay ? (
            <Stop />
          ) : isAudioLoading ? (
            <CircularProgress
              variant="indeterminate"
              size="1rem"
              color="inherit"
            />
          ) : (
            <PlayArrow />
          )}
        </Fab>
      </Grid>
      <Grid item>
        <Fab size="small" component={Link} href={url} download>
          <CloudDownload />
        </Fab>
      </Grid>
    </Grid>
  );
};

export const Talk: React.FC<{
  characterId: number;
  characterName: string;
  text: string;
  voiceUrl: string;
}> = ({ characterId, characterName, text, voiceUrl }) => {
  return (
    <CardStyled>
      <Grid container alignItems="center" spacing={1}>
        <Grid item xs={3} md={2} lg={1}>
          <Grid container justifyContent="center">
            <Avatar
              src={charaIcons[`CharaIcon${characterId}` as "CharaIcon1"]}
            />
          </Grid>
        </Grid>
        <Grid item xs={7} md={9} lg={10}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Chip label={characterName} />
            </Grid>
            <Grid item xs={12}>
              <Typography>{text}</Typography>
            </Grid>
          </Grid>
        </Grid>
        {voiceUrl ? (
          <Grid item xs={1}>
            <AudioPlayButton url={voiceUrl} />
          </Grid>
        ) : null}
      </Grid>
    </CardStyled>
  );
};

export const SpecialEffect: React.FC<{
  seType: string;
  text: string;
  resource: string;
}> = ({ seType, text, resource }) => {
  const { t } = useTranslation();

  const [isBGOpen, setIsBGOpen] = useState(false);
  const [isMovieOpen, setIsMovieOpen] = useState(false);

  switch (seType) {
    case "FullScreenText":
      return (
        <CardStyled>
          <Grid container alignItems="center" spacing={1}>
            <Grid item xs={3} md={2} lg={1}></Grid>
            <Grid item xs={7} md={9} lg={10}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Chip label={t("story_reader:snippet.FullScreenText")} />
                </Grid>
                <Grid item xs={12}>
                  <Typography>{text.trimStart()}</Typography>
                </Grid>
              </Grid>
            </Grid>
            {resource ? (
              <Grid item xs={1}>
                <AudioPlayButton url={resource} />
              </Grid>
            ) : null}
          </Grid>
        </CardStyled>
      );
    case "Telop":
      return (
        <CardStyled>
          <Grid container alignItems="center" spacing={1}>
            <Grid item xs={3} md={2} lg={1}></Grid>
            <Grid item xs={8} md={9} lg={10}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Chip label={t("story_reader:snippet.Telop")} />
                </Grid>
                <Grid item xs={12}>
                  <Typography>{text.trimStart()}</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardStyled>
      );
    case "ChangeBackground":
      return (
        <CardStyled>
          <Grid container alignItems="center" spacing={1}>
            <Grid item xs={3} md={2} lg={1}></Grid>
            <Grid item xs={8} md={9} lg={10}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Chip label={t("story_reader:snippet.ChangeBackground")} />
                </Grid>
                {isBGOpen ? (
                  <Grid item xs={12}>
                    <div onClick={() => window.open(resource, "_blank")}>
                      <Image
                        src={resource}
                        style={{ cursor: "pointer" }}
                        bgColor=""
                        // aspectRatio={1.624}
                      />
                    </div>
                  </Grid>
                ) : (
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={() => setIsBGOpen(true)}
                    >
                      {t("story_reader:snippet.ShowBackground")}
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        </CardStyled>
      );
    case "Movie":
      return (
        <CardStyled>
          <Grid container alignItems="center" spacing={1}>
            <Grid item xs={3} md={2} lg={1}></Grid>
            <Grid item xs={8} md={9} lg={10}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Chip label={t("story_reader:snippet.Movie")} />
                </Grid>
                {isMovieOpen ? (
                  <Grid item xs={12}>
                    <MoviePlayer
                      path={resource}
                      style={{ maxWidth: "100%" }}
                      controls
                    />
                  </Grid>
                ) : (
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={() => setIsMovieOpen(true)}
                    >
                      {t("story_reader:snippet.ShowMovie")}
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Grid>
          </Grid>
        </CardStyled>
      );
    default:
      return null;
  }
};

export const Sound: React.FC<{
  hasBgm: boolean;
  hasSe: boolean;
  voiceUrl: string;
}> = ({ hasBgm, hasSe, voiceUrl }) => {
  const { t } = useTranslation();

  return (
    <CardStyled>
      <Grid container alignItems="center" spacing={1}>
        <Grid item xs={3} md={2} lg={1}></Grid>
        <Grid item xs={7} md={9} lg={10}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Chip
                label={
                  hasBgm
                    ? t("story_reader:snippet.BGM")
                    : hasSe
                      ? t("story_reader:snippet.SE")
                      : "UNKNOWN"
                }
              />
            </Grid>
            {voiceUrl.endsWith("bgm00000.mp3") ? (
              <Grid item xs={12}>
                <Typography>{t("story_reader:snippet.NoSound")}</Typography>
              </Grid>
            ) : null}
          </Grid>
        </Grid>
        {voiceUrl && !voiceUrl.endsWith("bgm00000.mp3") ? (
          <Grid item xs={1}>
            <AudioPlayButton url={voiceUrl} />
          </Grid>
        ) : null}
      </Grid>
    </CardStyled>
  );
};
