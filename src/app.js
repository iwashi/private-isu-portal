import 'babel-polyfill';
import _ from 'underscore';
import Firebase from 'firebase';
google.load("visualization", "1", {packages:["corechart"]});

/**
 * GoogleChartsでの描画用にグラフを整形する。
 *
 * [
 *   [timestamp, 100,   0,    0 ]
 *   [timestamp, 0,   200,    0 ]
 *   [timestamp, 400,   0,    0 ]
 *   [timestamp, 0,   100,  100 ]
 * ]
 * という2次元配列をグラフ描画用に
 * [
 *   [timestamp, 100,     0,    0 ]
 *   [timestamp, 100,   200,    0 ]
 *   [timestamp, 400,   200,    0 ]
 *   [timestamp, 400,   100,  100 ]
 * ]
 * に直す
 *
 * @param arrayToDraw 整形前の配列
 */
function normalizeGraph(arrayToDraw) {
  arrayToDraw.forEach((row, i) => {
    // skip 1st row
    if (i !== 0) {
      for (let k = 1; k < row.length; k++) {
        // arrayToDraw[i - 1][k];
        if (row[k] === 0) {
          row[k] = arrayToDraw[i - 1][k];
        }
      }
    }
  });
}

// 折れ線グラフと棒グラフを描画する
async function draw() {
  try {
    const response = await fetch(url);
    const jsonResponse = await response.json();

    const teams = Object.keys(jsonResponse);
    const arrayToDraw = []; // グラフ描画用の配列
    const timeStamps = [];  // グラフ描画用の配列を作成するための、一時的なタイムスタンプ配列

    // タイムスタンプのみが格納された配列を作る
    teams.forEach(teamName => {
      Object.values(jsonResponse[teamName]).forEach(result => {
        if (!_.contains(timeStamps, result.timestamp)){
          timeStamps.push(result.timestamp);
        }
      });
    });

    // タイムスタンプに対応するスコアを描画用の配列に入れる
    timeStamps.sort().forEach((timestamp, i) => {
      arrayToDraw.push([new Date(timestamp)]);
      teams.forEach((teamName, k) => {
        let t = 0;
        Object.values(jsonResponse[teamName]).forEach(result => {
          if(result.timestamp === timestamp) {
            t = result.score;
          }
        });
        arrayToDraw[i][k + 1] = t || 0;
      });
    });

    // グラフ描画用に整形する
    normalizeGraph(arrayToDraw);

    drawChart();
    drawBarChart();

    // 折れ線グラフを描画する
    function drawChart() {
      const dataTable= new google.visualization.DataTable();
      dataTable.addColumn('datetime','時間');

      teams.forEach(teamName => {
        dataTable.addColumn('number', teamName);
      });

      dataTable.addRows(arrayToDraw);

      const options = {title: 'TD ISUCON Score', height:  320};
      const chart = new google.visualization.LineChart(document.getElementById('score'));

      chart.draw(dataTable, options);
    }

    // 棒グラフを描画する
    function drawBarChart() {
      const arrayToDrawBar = [];

      teams.forEach((teamName, i) => {
        arrayToDrawBar.push([teamName, arrayToDraw[arrayToDraw.length - 1][i + 1]]);
      });

      arrayToDrawBar.unshift(['チーム名', 'スコア']);

      arrayToDrawBar.sort((a, b) => {
        if (a[1] < b[1]) {
          return 1;
        } else if (a[1] > b[1]) {
          return -1;
        } else {
          return 0;
        }
      });

      const dataBar = new google.visualization.arrayToDataTable(arrayToDrawBar);
      const barChart = new google.visualization.BarChart(document.getElementById('barChart'));

      const options = {
        height: 320 
      };

      barChart.draw(dataBar, options);
    }

    const timeElement = document.getElementById('time');
    timeElement.innerHTML = new Date();

  } catch (error) {
    console.error(error);
  }
}

// XXXXをご自身のFirebaseプロジェク卜のURLに変更してください
const baseUrl = 'https://XXXX.firebaseio.com/'; 
const url = `${baseUrl}teams/.json`;
const myFirebaseRef = new Firebase(baseUrl);

// 初回描画
google.setOnLoadCallback(draw);

// 次回以降 
myFirebaseRef.child("teams/").on("child_changed", () => {
  draw();
});
