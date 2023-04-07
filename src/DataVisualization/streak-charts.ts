import { StoredUser } from '../models/user.model.js';
import { createCanvas, Canvas } from 'canvas';


export async function create_message_leaderboard(user_message_count: Map<string, number>, user_id_to_user: Map<string, StoredUser>): Promise<Canvas> {
    const { Chart, Colors } = await require('chart.js/auto');
    const ChartDataLabels = await require('chartjs-plugin-datalabels');

    Chart.register(Colors);
    Chart.register(ChartDataLabels);
    Chart.defaults.animation = false;
    Chart.defaults.responsive = false;

    const canvas = createCanvas(1000, 1000);

    let data = {
        labels: [],
        datasets: [{
            label: 'scores',
            data: [],
            backgroundColor: [],
        }],
    };

    user_message_count.forEach((count, user_id) => {
        data.labels.push(user_id_to_user.get(user_id).name,);
        data.datasets[0].data.push(count);
        data.datasets[0].backgroundColor.push(stringToColour(user_id));
    })

    new Chart(canvas as unknown as HTMLCanvasElement, {
        type: 'bar',
        data,
        options: {
            indexAxis: 'y',
            plugins:{
                datalabels: {
                    color: '#ffffff',
                    anchor: 'end',
                    align: 'end',
                    font:{
                        weight: 'bold',
                        size: 24,
                    },
                },
                legend:{
                    display: false,
                }
            },
            scales:{
                y: {
                    border:{
                        display: false,
                    },
                    ticks:{
                        font:{
                            weight: 'bold',
                            size: 30,
                        },
                        color: '#ffffff',
                    },
                    grid:{
                        display: false,
                    }
                },
                x: {
                    border:{
                        display: false,
                    },
                    ticks: {
                        display: false,
                    },
                    grid: {
                        display: false,
                    }
                }
            },
        }
    });

    return canvas;
}

var stringToColour = function (str: string) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colour = '#';
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
}



