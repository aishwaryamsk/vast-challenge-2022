# Import pandas
import os
import numpy as np
import pandas as pd
from datetime import datetime
from datetime import timezone
from dateutil.relativedelta import relativedelta

join = os.path.join

home = './'
filepath = "./Datasets/Journals/"

finjournal_csv = "FinancialJournal"
participants_csv = "Participants"
format = ".csv"

df_finjournal = pd.read_csv(filepath + finjournal_csv + format)
df_finjournal.sort_values(
    by=['timestamp', 'participantId'], inplace=True, ignore_index=True)
df_participants = pd.read_csv(filepath + participants_csv + format)

wage = np.zeros((1011, ))
shelter = np.zeros((1011, ))
education = np.zeros((1011, ))
food = np.zeros((1011, ))
recreation = np.zeros((1011, ))
rent = np.zeros((1011, ))

# household sizes: 1,2,3 respectively
total_wage_percapita = np.zeros((3, ))
total_shelter_percapita = np.zeros((3, ))
total_education_percapita = np.zeros((3, ))
total_food_percapita = np.zeros((3, ))
total_rent_percapita = np.zeros((3, ))
total_recreation_percapita = np.zeros((3, ))
#
# fixed for missing participants: num participants' w/ missing activity in each household size: 1,2,3 respectively
household_grp_sizes_missing = np.zeros((3, ), dtype=int)

cost_of_living = np.zeros((3, ))


def remove_duplicate_transactions():
    global df_finjournal

    # remove duplicate transactions for all participants under Education in the first month
    for i in range(1011):
        # filter by participant id i
        indices_df = df_finjournal.index[(df_finjournal['category'] == 'Education') & (
            df_finjournal['participantId'] == i)]
        if len(indices_df) >= 1:
            # drop duplicate transaction under Education in the first month
            if df_finjournal.at[indices_df[0], 'amount'] == df_finjournal.at[indices_df[1], 'amount'] and \
                    df_finjournal.at[indices_df[0], 'timestamp'] == df_finjournal.at[indices_df[1], 'timestamp']:
                df_finjournal = df_finjournal.drop(indices_df[1])


    """ for i in range(1011):
        # filter by participant id i
        indices_df = df_finjournal.index[(df_finjournal['category'] == 'Shelter') & (
            df_finjournal['participantId'] == i)]
        if len(indices_df) >= 1:
            # drop duplicate transaction under Education in the first month
            # if df_finjournal.at[indices_df[0], 'timestamp'] == df_finjournal.at[indices_df[1], 'timestamp']:
            t0 = df_finjournal.at[indices_df[0], 'timestamp']
            t1 = df_finjournal.at[indices_df[1], 'timestamp']
            m0 = datetime.fromisoformat(t0[:-1]).date().month
            m1 = datetime.fromisoformat(t1[:-1]).date().month
            if m0 == m1 and \
                    df_finjournal.at[indices_df[1], 'amount'] == df_finjournal.at[indices_df[2], 'amount']:
            #if m0 == m1:
                # remove the first one, this one is usually larger
                df_finjournal = df_finjournal.drop(indices_df[0])
            else:
                print(i) """


def resetValues():
    global wage, shelter, education, food, recreation, rent, \
        total_wage_percapita, total_shelter_percapita, total_education_percapita, \
        total_food_percapita, total_rent_percapita, total_recreation_percapita, \
        household_grp_sizes_missing, cost_of_living

    wage.fill(0)
    shelter.fill(0)
    education.fill(0)
    food.fill(0)
    recreation.fill(0)
    rent.fill(0)

    # household sizes: 1,2,3 respectively
    total_wage_percapita.fill(0)
    total_shelter_percapita.fill(0)
    total_education_percapita.fill(0)
    total_food_percapita.fill(0)
    total_rent_percapita.fill(0)
    total_recreation_percapita.fill(0)
    # num participants in each household size: 1,2,3 respectively
    household_grp_sizes_missing.fill(0)
    cost_of_living.fill(0)


def compute_cost_of_living():
    global wage, shelter, education, food, recreation, rent, \
        total_wage_percapita, total_shelter_percapita, total_education_percapita, \
        total_food_percapita, total_rent_percapita, total_recreation_percapita, \
        household_grp_sizes_missing, cost_of_living

    # starts from March 1st 2022
    current_month_start_time = datetime.fromisoformat(
        '2022-03-01T00:00:00Z'[:-1])
    next_month_start_time = current_month_start_time + \
        relativedelta(months=1)  # 1 month after

    global df_finjournal
    len_df_finjournal = len(df_finjournal.index)
    monthly_cost_of_living = []
    month_num = 0
    
    #num participants in each household size: 1,2,3 respectively
    household_grp_sizes = np.zeros((3, ), dtype=int)

    for k, (index, row) in enumerate(df_finjournal.iterrows()):
        d = datetime.fromisoformat(row['timestamp'][:-1])

        # continue with current row after wriing to the file for the week
        # take avergae of weekly financial stability, I don't count Unknown status
        pid = int(row['participantId'])
        match row['category']:
            case 'Wage':
                wage[pid] += float(row['amount'])
            case 'Shelter':
                shelter[pid] += float(row['amount'])
            case 'Education':
                education[pid] += float(row['amount'])
            case 'Recreation':
                recreation[pid] += float(row['amount'])
            case 'RentAdjustment':
                rent[pid] += float(row['amount'])
            case 'Food':
                food[pid] += float(row['amount'])
            case _:
                print("no match")

        # current datetime is past the monthly interval or if last row in file
        if d >= next_month_start_time or \
                k == len_df_finjournal - 1:

            # record these values once for the month, they don't change
            if (household_grp_sizes[0] == 0):
                for partId in range(1011):  # 0-1010 participants, inclusive

                    # count num of household sizes
                    household_size = int(
                        df_participants.at[partId, 'householdSize'])
                    match household_size:
                        case 1:
                            household_grp_sizes[0] += 1
                        case 2:
                            household_grp_sizes[1] += 1
                        case 3:
                            household_grp_sizes[2] += 1
                        case _:
                            print('house size error')

            for partId in range(1011):
                household_size = int(
                    df_participants.at[partId, 'householdSize'])
                # sum of all amount in that household group
                total_wage_percapita[household_size-1] += wage[partId]
                total_shelter_percapita[household_size-1] += shelter[partId]
                total_education_percapita[household_size -
                                          1] += education[partId]
                total_food_percapita[household_size-1] += food[partId]
                total_rent_percapita[household_size-1] += rent[partId]
                total_recreation_percapita[household_size -
                                           1] += recreation[partId]

                if wage[partId]+rent[partId]+abs(shelter[partId]+education[partId]+food[partId]+recreation[partId]) == 0:
                    household_grp_sizes_missing[household_size-1] += 1

            # average cost of living per house hold size: 1,2,3
            #cost_of_living = np.zeros((3, ))
            # sum of all amount in that household group divided by size of household group
            # *no wage in cost of living*
            for household_size in range(3):
                cost_of_living[household_size] = \
                    ((np.sum(
                        total_shelter_percapita[household_size]) /
                      (household_grp_sizes[household_size]-household_grp_sizes_missing[household_size]))
                     + (np.sum(
                        total_education_percapita[household_size]) /
                        (household_grp_sizes[household_size]-household_grp_sizes_missing[household_size]))
                     + (np.sum(
                        total_food_percapita[household_size]) /
                        (household_grp_sizes[household_size]-household_grp_sizes_missing[household_size]))
                     + (np.sum(
                        total_rent_percapita[household_size]) /
                        (household_grp_sizes[household_size]-household_grp_sizes_missing[household_size]))
                     + (np.sum(
                        total_recreation_percapita[household_size]) /
                        (household_grp_sizes[household_size]-household_grp_sizes_missing[household_size])))

                # a new object for each household size
                entry = {
                    'month': month_num,
                    'householdSize': household_size+1,
                    'costOfLiving': cost_of_living[household_size]
                }
                monthly_cost_of_living.append(entry)

            # last row of last file has all NA values, so end it here
            if k == len_df_finjournal - 1:
                break

            month_num += 1

            # reset values
            resetValues()

            # update week interval
            next_month_start_time = next_month_start_time + relativedelta(
                months=1)

    # write to csv for that month
    fullname = os.path.join('./Monthly Data',
                            'Cost Of Living.csv')
    month_df = pd.DataFrame.from_records(monthly_cost_of_living)
    month_df.to_csv(fullname, index=False)


if __name__ == '__main__':
    remove_duplicate_transactions()
    compute_cost_of_living()
