import React, {
  ChangeEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  // useRef,
  useState,
} from "react";
import { Marvin, MarvinImage, MarvinSegment } from "marvinj-ts";
import {
  Box,
  Button,
  CardMedia,
  Checkbox,
  // CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  FormControl,
  FormControlLabel,
  Grid,
  Input,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Upload } from "@mui/icons-material";
import Information from "~icons/mdi/information";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  GridColDef,
  DataGrid,
  GridRowModel,
  GridRenderCellParams,
  GridRowId,
} from "@mui/x-data-grid";
import { createWorker } from "tesseract.js";
import {
  cardRarityTypeToRarity,
  useAlertSnackbar,
  useCachedData,
  useToggle,
} from "../../../utils";
import { ICardInfo } from "../../../types.d";
import { useStrapi } from "../../../utils/apiClient";
import Carousel from "react-material-ui-carousel";
import { Alert } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useRootStore } from "../../../stores/root";
import { observer } from "mobx-react-lite";
import { ISekaiCardState, ISekaiCardTeam } from "../../../stores/sekai";
import { autorun } from "mobx";
import { assetUrl } from "../../../utils/urls";

function initCOS(N: number = 64) {
  const entries = 2 * N * (N - 1);
  const COS = new Float64Array(entries);
  for (let i = 0; i < entries; i++) {
    COS[i] = Math.cos((i / (2 * N)) * Math.PI);
  }
  return COS;
}

const COS = initCOS(32);

function hash(data: Uint8ClampedArray, N: number = 64) {
  const greyScale = new Float64Array(N * N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const index = 4 * (N * i + j);
      greyScale[N * i + j] =
        0.299 * data[index + 0] +
        0.587 * data[index + 1] +
        0.114 * data[index + 2];
    }
  }
  const dct = applyDCT2(greyScale, N);
  const output = [];
  for (let x = 1; x <= 8; x++) {
    for (let y = 1; y <= 8; y++) {
      output.push(dct[32 * x + y]);
    }
  }
  const median = output.slice().sort((a, b) => a - b)[
    Math.floor(output.length / 2)
  ];
  for (let i = 0; i < output.length; i++) {
    output[i] = output[i] > median ? 1 : 0;
  }
  return output;
}

function applyDCT2(f: Float64Array, N: number = 64) {
  const c = new Float64Array(N);
  for (let i = 1; i < N; i++) c[i] = 1;
  c[0] = 1 / Math.sqrt(2);
  const F = new Float64Array(N * N);
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      let sum = 0;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          sum += COS[(2 * i + 1) * u] * COS[(2 * j + 1) * v] * f[N * i + j];
        }
      }
      sum *= (c[u] * c[v]) / 4;
      F[N * u + v] = sum;
    }
  }
  return F;
}

function distance(a: string, b: string) {
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      count++;
    }
  }
  return count;
}

interface CardRowModel {
  id: GridRowId;
  crop: string;
  full: string[];
  hashResults: [string, number][];
  distances: number[];
  level: number;
  masterRank: number;
  cardIds: number[];
  useIndex: number;
  trained: boolean;
  skillLevel: number;
  story1Unlock: boolean;
  story2Unlock: boolean;
}

const SekaiUserImportMember = observer(() => {
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    jwtToken,
    sekai: { sekaiCardTeamMap, setSekaiCardTeam },
    region,
  } = useRootStore();
  const { putSekaiCards } = useStrapi(jwtToken, region);
  const { showError, showSuccess } = useAlertSnackbar();

  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

  const [cards] = useCachedData<ICardInfo>("cards");

  const [isUploading, setIsUploading] = useState(false);
  const [rows, setRows] = useState<GridRowModel<CardRowModel>[]>([]);
  const [ocrEnable, setOcrEnabled] = useState(false);
  const [postingCardList, setPostingCardList] = useState(false);
  const [isCardSelectionOpen, toggleIsCardSelectionOpen] = useToggle(false);
  const [editId, setEditId] = useState(-1);
  const [helpOpen, toggleHelpOpen] = useToggle(false);
  const [sekaiCardTeam, setLocalSekaiCardTeam] = useState<ISekaiCardTeam>();

  useEffect(() => {
    autorun(() => {
      setLocalSekaiCardTeam(sekaiCardTeamMap.get(region));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxLevels = useMemo(() => [0, 20, 30, 50, 60], []);
  const trainingLevels = useMemo(() => [0, 999, 999, 40, 50], []);

  const mdUp = useMediaQuery(theme.breakpoints.up("sm"));

  const onReaderLoad = useCallback(
    (e: ProgressEvent<FileReader>) => {
      if (!e.target) return;
      const dataUrl = e.target.result;
      if (!dataUrl) return;

      if (typeof dataUrl === "string") {
        // load dataUrl into MarvinImage
        const original = new MarvinImage();
        setIsUploading(true);
        original.load(dataUrl, async () => {
          setRows([]);
          // if (!canvasRef.current) return;
          // const context = canvasRef.current.getContext("2d");

          // const factor = original.getWidth() / 640;
          // const factor = 1;
          const scaled = original.clone();
          Marvin.grayScale(original, scaled);
          // Marvin.scale(
          //   original,
          //   scaled,
          //   Math.floor(original.getWidth() / factor),
          //   Math.floor(original.getHeight() / factor)
          // );

          // const grayscale = scaled.clone();
          // Marvin.grayScale(scaled, grayscale);

          // scan card area, expect white pixels more than 80% in one line
          const areaBoundary = new MarvinSegment(-1, -1, -1, -1);

          // horizontal scan
          const Xthreshold = 0.75;
          for (let y = 0; y < scaled.getHeight(); y++) {
            let whitePixels = 0;
            for (let x = 0; x < scaled.getWidth(); x++) {
              if (scaled.getIntColor(x, y) === 0xffffffff) whitePixels++;
            }
            if (whitePixels / scaled.getWidth() >= Xthreshold) {
              // found
              areaBoundary.y1 = y;
              break;
            }
          }
          for (let y = scaled.getHeight(); y > 0; y--) {
            let whitePixels = 0;
            for (let x = scaled.getWidth(); x > 0; x--) {
              if (scaled.getIntColor(x, y) === 0xffffffff) whitePixels++;
            }
            if (whitePixels / scaled.getWidth() >= Xthreshold) {
              // found
              areaBoundary.y2 = y;
              break;
            }
          }
          areaBoundary.height = areaBoundary.y2 - areaBoundary.y1;
          // vertical scan
          const Ythreshold = 0.9;
          for (let x = 0; x < scaled.getWidth(); x++) {
            let whitePixels = 0;
            for (let y = areaBoundary.y1; y < areaBoundary.y2; y++) {
              if (scaled.getIntColor(x, y) === 0xffffffff) whitePixels++;
            }
            if (whitePixels / areaBoundary.height >= Ythreshold) {
              // found
              areaBoundary.x1 = x;
              break;
            }
          }
          for (let x = scaled.getWidth(); x > 0; x--) {
            let whitePixels = 0;
            for (let y = areaBoundary.y2; y > areaBoundary.y1; y--) {
              if (scaled.getIntColor(x, y) === 0xffffffff) whitePixels++;
            }
            if (whitePixels / areaBoundary.height >= Ythreshold) {
              // found
              areaBoundary.x2 = x;
              break;
            }
          }
          areaBoundary.width = areaBoundary.x2 - areaBoundary.x1;
          // console.log(areaBoundary);

          // crop
          Marvin.crop(
            scaled.clone(),
            scaled,
            areaBoundary.x1,
            areaBoundary.y1,
            areaBoundary.width,
            areaBoundary.height
          );
          const originalCrop = original.clone();
          Marvin.crop(
            original,
            originalCrop,
            areaBoundary.x1,
            areaBoundary.y1,
            areaBoundary.width,
            areaBoundary.height
          );
          // binarize
          Marvin.blackAndWhite(scaled.clone(), scaled, 3);
          // canvasRef.current.style.width = `${original.getWidth()}px`;
          // canvasRef.current.style.height = `${original.getHeight()}px`;
          // canvasRef.current.style.height = `${
          //   canvasRef.current.clientWidth *
          //   (scaled.getHeight() / scaled.getWidth())
          // }px`;
          // canvasRef.current.width = scaled.getWidth() * window.devicePixelRatio;
          // canvasRef.current.height =
          //   scaled.getHeight() * window.devicePixelRatio;
          // context?.clearRect(
          //   0,
          //   0,
          //   canvasRef.current.width,
          //   canvasRef.current.height
          // );
          // scaled.draw(canvasRef.current, 0, 0, null);

          // find card boundaries
          // card icon are squares, background is white, easy to distinguish
          let avgHeight = 0;
          let columnStartX: number[] = [];
          let avgWidth = 0;
          const rowStartY: number[] = [];
          const colorCode = 0xffffffff;

          // determine right icon height
          for (let x = 0; x < scaled.getWidth(); x++) {
            let cardY: number[] = [];
            const heights: number[] = [];
            let inCardArea = false;
            for (let y = 0; y < scaled.getHeight(); y++) {
              // vertical scan until pixel is not white, push it to array
              if (scaled.getIntColor(x, y) < colorCode && !inCardArea) {
                cardY.push(y);
                inCardArea = true;
              } else if (scaled.getIntColor(x, y) >= colorCode && inCardArea) {
                cardY.push(y);
                inCardArea = false;
              }
              if (cardY.length === 2 && cardY[1] - cardY[0] > 30) {
                // first row not full, ignore
                Marvin.crop(
                  scaled.clone(),
                  scaled,
                  0,
                  cardY[1] + 20,
                  scaled.getWidth(),
                  scaled.getHeight()
                );
                Marvin.crop(
                  originalCrop.clone(),
                  originalCrop,
                  0,
                  cardY[1] + 20,
                  originalCrop.getWidth(),
                  originalCrop.getHeight()
                );
                cardY = [];
                y = 0;
                continue;
              }
              if (cardY.length === 4) {
                // cardY.forEach((y) => {
                //   context?.beginPath();
                //   context?.moveTo(0, y);
                //   context?.lineTo(original.getWidth(), y);
                //   context?.stroke();
                // });
                const height = cardY[1] - cardY[0] + cardY[3] - cardY[2];
                if (
                  heights.length &&
                  Math.abs(height - heights[heights.length - 1]) > 10
                )
                  continue;
                rowStartY.push(cardY[0]);
                heights.push(height);
                cardY = [];
              }
            }
            if (heights.length) {
              // console.log(heights);
              avgHeight = Math.round(
                heights.slice(1).reduce((sum, curr) => sum + curr, 0) /
                  (heights.length - 1)
              );
              // check first row
              // console.log(rowStartY);
              // console.log(Math.abs(heights[0] - avgHeight));
              if (Math.abs(heights[0] - avgHeight) > 10) rowStartY.unshift();
              else if (Math.abs(heights[0] - avgHeight) >= 4)
                rowStartY[0] = rowStartY[0] - Math.abs(heights[0] - avgHeight);
              break;
            }
          }

          // determine right icon width
          let xSegments = 2;
          for (let y = rowStartY[0] - 20; y < scaled.getHeight(); y++) {
            let cardX: number[] = [];
            let widths: number[] = [];
            let inCardArea = false;
            for (let x = 0; x < scaled.getWidth(); x++) {
              // horizontal scan until pixel is not white, push it to array
              if (scaled.getIntColor(x, y) < colorCode && !inCardArea) {
                cardX.push(x);
                inCardArea = true;
              } else if (scaled.getIntColor(x, y) >= colorCode && inCardArea) {
                cardX.push(x);
                inCardArea = false;
              }
              // in extrem situation, for upper boundary of card thumb nail it may have more than 2 segmentations, e.g. 3.
              // if the calculated width from 2 segments is too small, can try 3 segments.
              if (cardX.length === xSegments * 2) {
                // console.log(cardX);
                // cardX.forEach((x) => {
                //   context?.beginPath();
                //   context?.moveTo(x, 0);
                //   context?.lineTo(x, original.getHeight());
                //   context?.stroke();
                // });
                const _cardX = [...cardX];
                const width = Array.from<number>({ length: xSegments }).reduce(
                  (sum, _, idx) => {
                    const segWidth = _cardX[idx * 2 + 1] - _cardX[idx * 2];
                    return sum + segWidth;
                  },
                  0
                );
                if (width < 60) {
                  xSegments += 1;
                  if (xSegments > 3) {
                    // do not use this x line to determine width, try next one
                    xSegments = 2;
                    y = rowStartY[1] - 15;
                    columnStartX = [];
                    widths = [];
                    break;
                  }
                  x = -1;
                  cardX = [];
                  continue;
                }
                if (
                  !!columnStartX.length &&
                  cardX[0] - columnStartX[columnStartX.length - 1] < 20
                ) {
                  // ignore this
                  continue;
                }
                widths.push(width);
                columnStartX.push(cardX[0]);
                cardX = [];
              }
            }
            if (widths.length) {
              // console.log(widths);
              avgWidth = Math.round(
                widths.reduce((sum, curr) => sum + curr, 0) / widths.length
              );
              break;
            }
          }

          // console.log(avgWidth, avgHeight, columnStartX, rowStartY);

          // columnStartX.forEach((x) => {
          //   context?.beginPath();
          //   context?.moveTo(x, 0);
          //   context?.lineTo(x, scaled.getHeight());
          //   context?.stroke();

          //   context?.beginPath();
          //   context?.moveTo(x + avgWidth, 0);
          //   context?.lineTo(x + avgWidth, scaled.getHeight());
          //   context?.stroke();
          // });

          // rowStartY.forEach((y) => {
          //   context?.beginPath();
          //   context?.moveTo(0, y);
          //   context?.lineTo(scaled.getWidth(), y);
          //   context?.stroke();

          //   context?.beginPath();
          //   context?.moveTo(0, y + avgHeight);
          //   context?.lineTo(scaled.getWidth(), y + avgHeight);
          //   context?.stroke();
          // });

          // context?.strokeRect(
          //   areaBoundary.x1,
          //   areaBoundary.y1,
          //   areaBoundary.width,
          //   areaBoundary.height
          // );

          // card thumbnail segmentation
          const cardThumbnails: MarvinImage[] = [];
          const cardLevels: MarvinImage[] = [];
          const cardMasterRanks: MarvinImage[] = [];
          const cardHashes: string[] = [];
          const len = Math.max(avgWidth, avgHeight) + 4;
          columnStartX.forEach((x) => {
            rowStartY.forEach((y) => {
              const card = new MarvinImage(len, len);
              Marvin.crop(originalCrop, card, x, y, len, len);
              // Marvin.crop(scaled, card, x, y, len, len);
              cardThumbnails.push(card);

              // card.draw(canvasRef.current!, x, y, null);
              const cropped = new MarvinImage();
              Marvin.crop(
                card,
                cropped,
                Math.round(len * 0.165),
                Math.round(len * 0.165),
                Math.round(len * 0.445),
                Math.round(len * 0.445)
              );
              // cropped.draw(canvasRef.current!, x, y, null);
              Marvin.scale(cropped.clone(), cropped, 32, 32);
              Marvin.grayScale(cropped.clone(), cropped);
              const hashed = hash(cropped.data, 32).join("");
              cardHashes.push(hashed);

              const _card = card.clone();
              Marvin.blackAndWhite(_card.clone(), _card, 10);
              Marvin.invertColors(_card.clone(), _card);
              const levelText = new MarvinImage();
              Marvin.crop(
                _card,
                levelText,
                3,
                len - Math.round(len * 0.2),
                Math.round(len * 0.5),
                Math.round(len * 0.2)
              );
              // levelText.draw(canvasRef.current!, x, y, null);
              cardLevels.push(levelText);

              const masterRank = new MarvinImage();
              const minusCoor =
                len > 115 ? Math.round(len * 0.24) : Math.round(len * 0.253);
              const size =
                len > 115 ? Math.round(len * 0.18) : Math.round(len * 0.17);
              Marvin.crop(
                _card,
                masterRank,
                len - minusCoor,
                len - minusCoor,
                size,
                size
              );
              Marvin.scale(masterRank.clone(), masterRank, 32, 32);
              // masterRank.draw(canvasRef.current!, x, y, null);
              cardMasterRanks.push(masterRank);
            });
          });

          // console.log(cardThumbnails);

          const cardDataURLs: string[] = [];
          for (const card of cardThumbnails) {
            // create pseudo canvas
            const _canvas = document.createElement("canvas");
            _canvas.width = card.getWidth();
            _canvas.height = card.getHeight();
            const _context = _canvas.getContext("2d");
            _context?.putImageData(card.loadImageData(), 0, 0);
            cardDataURLs.push(_canvas.toDataURL());
          }

          const { data: charaHash } = await axios.get<[string, string][]>(
            `${import.meta.env.VITE_FRONTEND_ASSET_BASE}/chara_hash.json`
          );

          // match hash
          const hashResults: [string, number][][] = [];
          cardHashes.forEach((hashValue) => {
            const mapped: [string, number][] = charaHash
              .map(
                (ch) => [ch[0], distance(ch[1], hashValue)] as [string, number]
              )
              .sort((a, b) => a[1] - b[1]);
            const matched = mapped
              .filter((m) => m[1] <= 24)
              .sort((a, b) => a[1] - b[1]);
            hashResults.push(
              matched.length
                ? matched[0][1] <= 10
                  ? matched.slice(0, 1)
                  : matched
                : [["", 64]]
            );
          });

          // console.log(hashResults);

          let ocrLevelResults: string[] = [];
          let ocrMasterRankResults: string[] = [];
          if (ocrEnable) {
            const worker = await createWorker("eng");

            const levelResults = await Promise.all(
              cardLevels.map((levelText) => {
                // create pseudo canvas
                const _canvas = document.createElement("canvas");
                _canvas.width = levelText.getWidth();
                _canvas.height = levelText.getHeight();
                const _context = _canvas.getContext("2d");
                _context?.putImageData(levelText.loadImageData(), 0, 0);
                return worker.recognize(_canvas.toDataURL());
              })
            );
            ocrLevelResults = levelResults.map((r) => r.data.text);

            const mrResults = await Promise.all(
              cardMasterRanks.map((mrText) => {
                // create pseudo canvas
                const _canvas = document.createElement("canvas");
                _canvas.width = mrText.getWidth();
                _canvas.height = mrText.getHeight();
                const _context = _canvas.getContext("2d");
                _context?.putImageData(mrText.loadImageData(), 0, 0);
                return worker.recognize(_canvas.toDataURL());
              })
            );
            ocrMasterRankResults = mrResults.map((r) => r.data.text);
          }

          const _rows = cardDataURLs.map((dataURL, idx) => {
            const cardIds =
              hashResults[idx].length && cards
                ? hashResults[idx].map(
                    (result) =>
                      cards!.find((card) =>
                        result[0].includes(card.assetbundleName)
                      )?.id || -1
                  )
                : [-1];
            const level = ocrLevelResults.length
              ? Number(
                  ocrLevelResults[idx].replace(/.*Lv.(\d{1,2}).*/, "$1")
                ) || 1
              : 1;
            const card = cards!.find((card) => card.id === cardIds[0]);
            return {
              cardIds,
              crop: dataURL,
              distances: hashResults[idx].length
                ? hashResults[idx].map((result) => result[1])
                : [0],
              full: hashResults[idx].length
                ? hashResults[idx].map(
                    (result) =>
                      `${assetUrl.minio.jp}/thumbnail/chara_rip/${result[0]}`
                  )
                : [""],
              hashResults: hashResults[idx],
              id: idx + 1,
              level,
              masterRank: ocrMasterRankResults.length
                ? Math.min(
                    Number(ocrMasterRankResults[idx].replace(/\D/g, "")),
                    5
                  ) || 0
                : 0,
              skillLevel: 1,
              story1Unlock: cardIds[0] !== -1,
              story2Unlock:
                cardIds[0] !== -1 &&
                level >=
                  maxLevels[cardRarityTypeToRarity[card!.cardRarityType!]],
              trained:
                (!!hashResults[idx].length &&
                  hashResults[idx][0][0].includes("after_training")) ||
                level >=
                  trainingLevels[cardRarityTypeToRarity[card!.cardRarityType!]],
              useIndex: cardIds.findIndex((cardId) => cardId !== -1),
            };
          });
          // console.log(_rows);
          setRows(_rows.filter((row) => row.distances[0] !== 64));

          setIsUploading(false);
        });
      }
    },
    [cards, maxLevels, ocrEnable, trainingLevels]
  );

  const handleValueChange = useCallback(
    (
      value: any,
      field: keyof CardRowModel,
      row: GridRowModel<CardRowModel>
    ) => {
      const { id } = row;
      const idx = rows.findIndex((row) => row.id === id);
      const elem = rows[idx];
      // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
      elem[field] = value;

      setRows([...rows.slice(0, idx), elem, ...rows.slice(idx + 1)]);
    },
    [rows]
  );

  const columns = useMemo(
    (): GridColDef<GridRowModel<CardRowModel>>[] => [
      { field: "id", headerName: t("common:id"), width: 60 },
      {
        align: "center",
        field: "crop",
        headerName: t("user:profile.import_card.table.row.cropped_image"),
        renderCell(
          params: GridRenderCellParams<string, GridRowModel<CardRowModel>>
        ) {
          return (
            <img
              src={params.value}
              style={{ height: "64px", width: "64px" }}
              alt=""
            />
          );
        },
        width: 100,
      },
      {
        align: "center",
        field: "bestMatch",
        headerName: t("user:profile.import_card.table.row.best_match"),
        renderCell(params) {
          const idx = params.row["useIndex"] as number;
          const card = cards?.find(
            (card) => card.id === (params.row["cardIds"] as number[])[idx]
          );
          return card ? (
            <Grid
              container
              direction="column"
              alignItems="center"
              onClick={() => {
                setEditId(Number(params.row.id));
                toggleIsCardSelectionOpen();
              }}
            >
              <img
                src={(params.row["full"] as string[])[idx]}
                style={{ cursor: "pointer", height: "64px", width: "64px" }}
                alt={`${(
                  (1 - (params.row["distances"] as number[])[idx] / 64) *
                  100
                ).toFixed(1)}%`}
              />
              <Typography>{`${(
                (1 - (params.row["distances"] as number[])[idx] / 64) *
                100
              ).toFixed(1)}%`}</Typography>
            </Grid>
          ) : (
            <Fragment></Fragment>
          );
        },
        width: 100,
      },
      {
        field: "level",
        headerName: t("card:cardLevel"),
        renderCell(
          params: GridRenderCellParams<number, GridRowModel<CardRowModel>>
        ) {
          return (
            <Input
              value={params.value}
              type="number"
              inputMode="numeric"
              inputProps={{
                max: 60,
                min: 0,
              }}
              fullWidth
              onChange={(e) =>
                handleValueChange(Number(e.target.value), "level", params.row)
              }
            />
          );
        },
        width: 100,
      },
      {
        field: "masterRank",
        headerName: t("user:profile.import_card.table.row.card_master_rank"),
        renderCell(
          params: GridRenderCellParams<number, GridRowModel<CardRowModel>>
        ) {
          return (
            <Input
              value={params.value}
              type="number"
              fullWidth
              inputMode="numeric"
              inputProps={{
                max: 5,
                min: 0,
              }}
              onChange={(e) =>
                handleValueChange(
                  Number(e.target.value),
                  "masterRank",
                  params.row
                )
              }
            />
          );
        },
        width: 100,
      },
      {
        field: "skillLevel",
        headerName: t("card:skillLevel"),
        renderCell(
          params: GridRenderCellParams<number, GridRowModel<CardRowModel>>
        ) {
          return (
            <Input
              value={params.value}
              type="number"
              fullWidth
              inputMode="numeric"
              inputProps={{
                max: 4,
                min: 0,
              }}
              onChange={(e) =>
                handleValueChange(
                  Number(e.target.value),
                  "skillLevel",
                  params.row
                )
              }
            />
          );
        },
        width: 100,
      },
      {
        field: "card_states",
        headerName: t("user:profile.import_card.table.row.card_states"),
        renderCell(params) {
          return (
            <Grid container direction="column">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={params.row["trained"] as boolean}
                    onChange={(e, checked) =>
                      handleValueChange(checked, "trained", params.row)
                    }
                    style={{
                      paddingBottom: "0.1rem",
                      paddingTop: "0.1rem",
                    }}
                  />
                }
                label={t("card:trained") as string}
              ></FormControlLabel>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={params.row["story1Unlock"] as boolean}
                    onChange={(e, checked) =>
                      handleValueChange(checked, "story1Unlock", params.row)
                    }
                    style={{
                      paddingBottom: "0.1rem",
                      paddingTop: "0.1rem",
                    }}
                  />
                }
                label={t("card:sideStory1Unlocked") as string}
              ></FormControlLabel>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={params.row["story2Unlock"] as boolean}
                    onChange={(e, checked) =>
                      handleValueChange(checked, "story2Unlock", params.row)
                    }
                    style={{
                      paddingBottom: "0.1rem",
                      paddingTop: "0.1rem",
                    }}
                  />
                }
                label={t("card:sideStory2Unlocked") as string}
              ></FormControlLabel>
            </Grid>
          );
        },
        width: 250,
      },
    ],
    [t, cards, toggleIsCardSelectionOpen, handleValueChange]
  );

  const handleSubmitCardList = useCallback(async () => {
    if (!sekaiCardTeam || !cards) return;
    setPostingCardList(true);
    try {
      // console.log(rows);
      const cardList: ISekaiCardState[] = rows
        .map((row) => {
          const cardId = row.cardIds[row.useIndex];
          const cardInfo = cards.find((card) => card.id === cardId)!;
          const trainable =
            cardInfo.cardRarityType !== "rarity_birthday" &&
            cardRarityTypeToRarity[cardInfo.cardRarityType!] >= 3;

          return {
            cardId,
            level: row.level,
            masterRank: row.masterRank,
            skillLevel: row.skillLevel,
            story1Unlock: row.story1Unlock,
            story2Unlock: row.story2Unlock,
            trainable,
            trained: trainable && row.trained,
          };
        })
        .sort((a, b) => a.cardId - b.cardId);

      await putSekaiCards(sekaiCardTeam.id, cardList);

      if (sekaiCardTeam.cards && sekaiCardTeam.cards.length) {
        sekaiCardTeam.cards.forEach((card) => {
          if (!cardList.some((_card) => _card.cardId === card.cardId)) {
            cardList.push(card);
          }
        });
        cardList.sort((a, b) => a.cardId - b.cardId);
      }

      // updateSekaiProfile({
      //   cardList,
      // });
      const sct = Object.assign({}, sekaiCardTeam, {
        cards: cardList,
      });
      setSekaiCardTeam(sct, region);
      // setSekaiCardTeam(sct);

      showSuccess(t("user:profile.import_card.submit_success"));
    } catch (error) {
      console.error(error);
      showError(t("user:profile.import_card.submit_error"));
    }
    setPostingCardList(false);
  }, [
    cards,
    putSekaiCards,
    region,
    rows,
    sekaiCardTeam,
    setSekaiCardTeam,
    showError,
    showSuccess,
    t,
  ]);

  return (
    <Grid container direction="column">
      <Alert
        severity="warning"
        sx={(theme) => ({ margin: theme.spacing(1, 0) })}
      >
        {t("common:betaIndicator")}
      </Alert>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Box
            component="input"
            sx={{ display: "none" }}
            accept="image/png,image/jpeg"
            id="upload-member-button"
            type="file"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (!e.target.files || !e.target.files.length) return;
              const file = e.target.files.item(0);
              if (!file?.type.startsWith("image/")) return;

              const reader = new FileReader();

              reader.onload = onReaderLoad;

              reader.readAsDataURL(file);

              e.target.value = "";
            }}
            disabled={isUploading || !cards || !cards.length}
          />
          <Grid container alignItems="center" spacing={1}>
            <Grid item>
              <label htmlFor="upload-member-button">
                <LoadingButton
                  variant="outlined"
                  component="span"
                  disabled={!cards || !cards.length}
                  loading={isUploading}
                  startIcon={<Upload />}
                >
                  {t("user:profile.import_card.import_button")}
                </LoadingButton>
              </label>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Information />}
                onClick={() => toggleHelpOpen()}
              >
                {t("common:help")}
              </Button>
            </Grid>
          </Grid>
        </Grid>
        {/* <Grid item container>
          <Grid item xs={12}>
            <canvas ref={canvasRef} style={{ width: "100%" }}></canvas>
          </Grid>
        </Grid> */}
        <Grid item xs={12}>
          <Grid container>
            <Grid item>
              <Tooltip
                title={
                  <Typography
                    variant="caption"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {t("user:profile.import_card.enable_ocr_tooltip")}
                  </Typography>
                }
                arrow
              >
                <FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={ocrEnable}
                        onChange={(ev) => setOcrEnabled(ev.target.checked)}
                      />
                    }
                    label={t("user:profile.import_card.enable_ocr") as string}
                  />
                </FormControl>
              </Tooltip>
            </Grid>
          </Grid>
        </Grid>
        {mdUp && (
          <Grid item xs={12} style={{ height: "600px" }}>
            <DataGrid
              columns={columns}
              rows={rows}
              disableColumnFilter
              disableColumnMenu
              disableSelectionOnClick
              rowHeight={100}
              pageSize={100}
            />
          </Grid>
        )}
        <Grid item xs={12}>
          <Grid container spacing={1}>
            {!mdUp &&
              rows.map((row) => (
                <Grid item xs={12} key={row.id}>
                  <Paper variant="outlined" style={{ padding: "0.5rem" }}>
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <Grid
                          container
                          justifyContent="space-around"
                          alignItems="center"
                          spacing={1}
                        >
                          <Grid item>
                            <img
                              src={row.crop}
                              style={{ height: "64px", width: "64px" }}
                              alt=""
                            />
                          </Grid>
                          <Grid item>
                            <Grid
                              container
                              direction="column"
                              alignItems="center"
                              onClick={() => {
                                setEditId(Number(row.id));
                                toggleIsCardSelectionOpen();
                              }}
                            >
                              <img
                                src={row.full[row.useIndex]}
                                style={{
                                  cursor: "pointer",
                                  height: "64px",
                                  width: "64px",
                                }}
                                alt={`${(
                                  (1 - row.distances[row.useIndex] / 64) *
                                  100
                                ).toFixed(1)}%`}
                              />
                              <Typography>{`${(
                                (1 - row.distances[row.useIndex] / 64) *
                                100
                              ).toFixed(1)}%`}</Typography>
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>
                      <Grid item xs={12}>
                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <TextField
                              value={row.level}
                              type="number"
                              fullWidth
                              inputMode="numeric"
                              inputProps={{
                                max: 60,
                                min: 0,
                              }}
                              label={t("card:cardLevel")}
                              onChange={(e) =>
                                handleValueChange(e.target.value, "level", row)
                              }
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              value={row.masterRank}
                              type="number"
                              fullWidth
                              inputMode="numeric"
                              inputProps={{
                                max: 5,
                                min: 0,
                              }}
                              label={t(
                                "user:profile.import_card.table.row.card_master_rank"
                              )}
                              onChange={(e) =>
                                handleValueChange(
                                  e.target.value,
                                  "masterRank",
                                  row
                                )
                              }
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              value={row.skillLevel}
                              type="number"
                              fullWidth
                              inputMode="numeric"
                              inputProps={{
                                max: 4,
                                min: 0,
                              }}
                              label={t("card:skillLevel")}
                              onChange={(e) =>
                                handleValueChange(
                                  e.target.value,
                                  "skillLevel",
                                  row
                                )
                              }
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                      <Grid item xs={12}>
                        <Grid container direction="column">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={row.trained}
                                onChange={(e, checked) =>
                                  handleValueChange(checked, "trained", row)
                                }
                                style={{
                                  paddingBottom: "0.1rem",
                                  paddingTop: "0.1rem",
                                }}
                              />
                            }
                            label={t("card:trained") as string}
                          ></FormControlLabel>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={row.story1Unlock}
                                onChange={(e, checked) =>
                                  handleValueChange(
                                    checked,
                                    "story1Unlock",
                                    row
                                  )
                                }
                                style={{
                                  paddingBottom: "0.1rem",
                                  paddingTop: "0.1rem",
                                }}
                              />
                            }
                            label={t("card:sideStory1Unlocked") as string}
                          ></FormControlLabel>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={row.story2Unlock}
                                onChange={(e, checked) =>
                                  handleValueChange(
                                    checked,
                                    "story2Unlock",
                                    row
                                  )
                                }
                                style={{
                                  paddingBottom: "0.1rem",
                                  paddingTop: "0.1rem",
                                }}
                              />
                            }
                            label={t("card:sideStory2Unlocked") as string}
                          ></FormControlLabel>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <LoadingButton
            variant="contained"
            color="primary"
            disabled={!rows.length}
            loading={postingCardList}
            onClick={handleSubmitCardList}
            fullWidth
            // startIcon={postingCardList && <CircularProgress size={24} />}
          >
            {t("common:submit")}
          </LoadingButton>
        </Grid>
      </Grid>
      <Dialog
        open={isCardSelectionOpen}
        onClose={() => toggleIsCardSelectionOpen()}
        fullWidth
      >
        <DialogContent>
          <DialogContentText>
            {t("user:profile.import_card.table.row.other_possible_result")}
          </DialogContentText>
          <Grid container spacing={1}>
            {!!rows.length &&
              editId !== -1 &&
              rows
                .find((row) => row.id === editId)!
                .full.map((url, idx) => (
                  <Grid
                    key={idx}
                    item
                    onClick={() => {
                      const rowIndex = rows.findIndex(
                        (row) => row.id === editId
                      )!;
                      const row = rows[rowIndex];
                      row.useIndex = idx;
                      row.trained = url.includes("after_training");
                      setRows([
                        ...rows.slice(0, rowIndex),
                        row,
                        ...rows.slice(rowIndex + 1),
                      ]);
                      toggleIsCardSelectionOpen();
                      setEditId(-1);
                    }}
                    sx={{
                      display:
                        rows.find((row) => row.id === editId)?.cardIds[idx] ===
                        -1
                          ? "none"
                          : "inherit",
                    }}
                    xs={2}
                  >
                    <Grid container direction="column" alignItems="center">
                      <img
                        src={url}
                        style={{
                          cursor: "pointer",
                          height: "64px",
                          width: "64px",
                        }}
                        alt={`${(
                          (1 -
                            rows.find((row) => row.id === editId)!.distances[
                              idx
                            ] /
                              64) *
                          100
                        ).toFixed(1)}%`}
                      />
                      <Typography>{`${(
                        (1 -
                          rows.find((row) => row.id === editId)!.distances[
                            idx
                          ] /
                            64) *
                        100
                      ).toFixed(1)}%`}</Typography>
                    </Grid>
                  </Grid>
                ))}
          </Grid>
        </DialogContent>
        <DialogContent>
          <DialogContentText>
            {t("user:profile.import_card.wrong_result")}
          </DialogContentText>
          <Button
            color="secondary"
            variant="contained"
            onClick={() => {
              const idx = rows.findIndex((row) => row.id === editId)!;
              setRows([...rows.slice(0, idx), ...rows.slice(idx + 1)]);
              toggleIsCardSelectionOpen();
              setEditId(-1);
            }}
          >
            {t("common:delete")}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={helpOpen}
        onClose={() => toggleHelpOpen()}
        fullWidth
        fullScreen={fullScreen}
      >
        <Carousel swipe autoPlay={false}>
          <DialogContent>
            <CardMedia
              image={`${
                import.meta.env.VITE_FRONTEND_ASSET_BASE
              }/import_cards/Screenshot_20210130-184257.jpg`}
              title="import card step 1"
              sx={(theme) => ({
                [theme.breakpoints.down("md")]: {
                  paddingTop: "75%",
                },
                [theme.breakpoints.up("md")]: {
                  paddingTop: "56.25%",
                },
                backgroundSize: "contain",
                width: "100%",
              })}
            />
            <DialogContentText>
              <Typography>
                {t("user:profile.import_card.help.step1.title")}
              </Typography>
              <br />
              <Typography
                sx={{
                  "&": {
                    textAlign: "left",
                    whiteSpace: "pre-line",
                  },
                }}
              >
                {t("user:profile.import_card.help.step1.subtitle")}
              </Typography>
            </DialogContentText>
          </DialogContent>
          <DialogContent>
            <CardMedia
              image={`${
                import.meta.env.VITE_FRONTEND_ASSET_BASE
              }/import_cards/step2.png`}
              title="import card step 2"
              sx={(theme) => ({
                [theme.breakpoints.down("md")]: {
                  paddingTop: "75%",
                },
                [theme.breakpoints.up("md")]: {
                  paddingTop: "56.25%",
                },
                backgroundSize: "contain",
                width: "100%",
              })}
            />
            <DialogContentText>
              <Typography>
                {t("user:profile.import_card.help.step2.title")}
              </Typography>
              <br />
              <Typography
                sx={{
                  "&": {
                    textAlign: "left",
                    whiteSpace: "pre-line",
                  },
                }}
              >
                {t("user:profile.import_card.help.step2.subtitle")}
              </Typography>
            </DialogContentText>
          </DialogContent>
          <DialogContent>
            <CardMedia
              image={`${
                import.meta.env.VITE_FRONTEND_ASSET_BASE
              }/import_cards/step3.png`}
              title="import card step 3"
              sx={(theme) => ({
                [theme.breakpoints.down("md")]: {
                  paddingTop: "75%",
                },
                [theme.breakpoints.up("md")]: {
                  paddingTop: "56.25%",
                },
                backgroundSize: "contain",
                width: "100%",
              })}
            />
            <DialogContentText>
              <Typography>
                {t("user:profile.import_card.help.step3.title")}
              </Typography>
              <br />
              <Typography
                sx={{
                  "&": {
                    textAlign: "left",
                    whiteSpace: "pre-line",
                  },
                }}
              >
                {t("user:profile.import_card.help.step3.subtitle")}
              </Typography>
            </DialogContentText>
          </DialogContent>
          <DialogContent>
            <CardMedia
              image={`${
                import.meta.env.VITE_FRONTEND_ASSET_BASE
              }/import_cards/step4.png`}
              title="import card step 4"
              sx={(theme) => ({
                [theme.breakpoints.down("md")]: {
                  paddingTop: "75%",
                },
                [theme.breakpoints.up("md")]: {
                  paddingTop: "56.25%",
                },
                backgroundSize: "contain",
                width: "100%",
              })}
            />
            <DialogContentText>
              <Typography>
                {t("user:profile.import_card.help.step4.title")}
              </Typography>
              <br />
              <Typography
                sx={{
                  "&": {
                    textAlign: "left",
                    whiteSpace: "pre-line",
                  },
                }}
              >
                {t("user:profile.import_card.help.step4.subtitle")}
              </Typography>
            </DialogContentText>
          </DialogContent>
        </Carousel>
        {fullScreen && (
          <DialogActions>
            <Button onClick={() => toggleHelpOpen()} variant="contained">
              {t("common:close")}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Grid>
  );
});

export default SekaiUserImportMember;
